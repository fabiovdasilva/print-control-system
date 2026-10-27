using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.IO;
using System.Linq;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using ServerMock.Models;

var builder = WebApplication.CreateBuilder(args);

var dashboardOrigins = (Environment.GetEnvironmentVariable("PRINT_CONTROL_CORS_ORIGINS")
    ?? "http://localhost:5173;http://127.0.0.1:5173")
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Dashboard",
        policy => policy.WithOrigins(dashboardOrigins)
            .AllowAnyMethod()
            .WithHeaders("Content-Type", "X-Admin-Key", "X-Agent-Client", "X-Agent-Token"));
});

var databasePath = Environment.GetEnvironmentVariable("PRINT_CONTROL_DB_PATH")
    ?? builder.Configuration["Database:Path"]
    ?? Path.Combine(builder.Environment.ContentRootPath, "printcontrol.db");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={databasePath}"));

var adminApiKey = Environment.GetEnvironmentVariable("PRINT_CONTROL_ADMIN_KEY")
    ?? builder.Configuration["Security:AdminApiKey"];
if (string.IsNullOrWhiteSpace(adminApiKey))
{
    adminApiKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    Console.WriteLine($"[SEGURANÇA] Chave administrativa temporária (configure PRINT_CONTROL_ADMIN_KEY para persistir): {adminApiKey}");
}

var app = builder.Build();
app.UseCors("Dashboard");
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value?.TrimEnd('/') ?? string.Empty;
    if (context.Request.Method == "OPTIONS" || path == "/api/health")
    {
        await next();
        return;
    }

    var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
    var method = context.Request.Method;
    var isAgentEndpoint =
        (method == "POST" && (path == "/api/agent/heartbeat" || path == "/api/agent/report-printers" || path == "/api/agent/report-job" ||
            (segments.Length == 6 && segments[0] == "api" && segments[1] == "agent" && segments[3] == "commands" && segments[5] == "ack"))) ||
        (method == "GET" && segments.Length == 4 && segments[0] == "api" && segments[1] == "agent" && (segments[3] == "commands" || segments[3] == "quotas"));

    if (isAgentEndpoint)
    {
        if (!int.TryParse(context.Request.Headers["X-Agent-Client"], out var clientId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { message = "Agent identity is missing." });
            return;
        }

        if (segments.Length >= 3 && int.TryParse(segments[2], out var routeClientId) && routeClientId != clientId)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        var providedToken = context.Request.Headers["X-Agent-Token"].ToString();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var client = await db.Clients.FindAsync(clientId);
        var expectedHash = client?.AgentTokenHash;
        var providedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(providedToken)));
        if (string.IsNullOrWhiteSpace(expectedHash) || !SecretsMatch(providedHash, expectedHash))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { message = "Invalid agent credentials." });
            return;
        }
    }
    else
    {
        var providedKey = context.Request.Headers["X-Admin-Key"].ToString();
        if (!SecretsMatch(providedKey, adminApiKey))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { message = "Admin key is required." });
            return;
        }
    }

    await next();
});

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    try {
        db.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS UserQuotas (Id INTEGER NOT NULL CONSTRAINT PK_UserQuotas PRIMARY KEY AUTOINCREMENT, ClientId INTEGER NOT NULL, UserName TEXT NOT NULL, MaxPages INTEGER NOT NULL, PagesUsed INTEGER NOT NULL, IsBlocked INTEGER NOT NULL, CONSTRAINT FK_UserQuotas_Clients_ClientId FOREIGN KEY (ClientId) REFERENCES Clients (Id) ON DELETE CASCADE)");
    } catch { }
    try {
        db.Database.ExecuteSqlRaw("ALTER TABLE Clients ADD COLUMN OfflineToleranceHours INTEGER NOT NULL DEFAULT 48");
    } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE Clients ADD COLUMN NetworkSubnets TEXT NOT NULL DEFAULT ''"); } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE Clients ADD COLUMN SnmpCommunity TEXT NOT NULL DEFAULT 'public'"); } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE Clients ADD COLUMN PollInterval INTEGER NOT NULL DEFAULT 15"); } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE Clients ADD COLUMN AgentTokenHash TEXT NULL"); } catch { }
    db.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS PendingAgentCommands (Id INTEGER NOT NULL CONSTRAINT PK_PendingAgentCommands PRIMARY KEY AUTOINCREMENT, ClientId INTEGER NOT NULL, Command TEXT NOT NULL, Hostname TEXT NULL, CreatedAt TEXT NOT NULL, DeliveredAt TEXT NULL, AcknowledgedAt TEXT NULL, Attempts INTEGER NOT NULL DEFAULT 0, LastError TEXT NULL)");
    try { db.Database.ExecuteSqlRaw("ALTER TABLE PendingAgentCommands ADD COLUMN AcknowledgedAt TEXT NULL"); } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE PendingAgentCommands ADD COLUMN Attempts INTEGER NOT NULL DEFAULT 0"); } catch { }
    try { db.Database.ExecuteSqlRaw("ALTER TABLE PendingAgentCommands ADD COLUMN LastError TEXT NULL"); } catch { }
}

// Dicionários em memória (sem precisar de DB extra)
ConcurrentDictionary<int, ConcurrentDictionary<string, DateTime>> agentHeartbeats = new();


ConcurrentDictionary<int, ConcurrentDictionary<string, AgentRoleConfig>> agentConfigs = new();

AgentRoleConfig GetOrCreateAgentRoleConfig(int clientId, string hostname)
{
    var configs = agentConfigs.GetOrAdd(clientId, _ => new());
    lock (configs)
    {
        if (configs.TryGetValue(hostname, out var existing))
            return existing;

        var config = new AgentRoleConfig { IsScannerEnabled = configs.IsEmpty };
        configs[hostname] = config;
        return config;
    }
}

// ==========================================
// CLIENTES
// ==========================================

app.MapGet("/api/clients", async (AppDbContext db) =>
{
    var clients = await db.Clients.ToListAsync();
    return Results.Ok(clients.Select(c => new {
        id = c.Id, name = c.Name, doc = c.ClientCode,
        email = c.Email, phone = c.Phone,
        address = c.Address, plan = c.Plan,
        offlineToleranceHours = c.OfflineToleranceHours,
        networkSubnets = c.NetworkSubnets,
        snmpCommunity = c.SnmpCommunity,
        pollInterval = c.PollInterval
    }));
});

app.MapPost("/api/clients", async (HttpRequest request, AppDbContext db) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);

    string name    = doc.RootElement.TryGetProperty("name",    out var n)  ? n.GetString()  ?? "" : "";
    string code    = doc.RootElement.TryGetProperty("doc",     out var d)  ? d.GetString()  ?? "" : "";
    string email   = doc.RootElement.TryGetProperty("email",   out var e)  ? e.GetString()  ?? "" : "";
    string phone   = doc.RootElement.TryGetProperty("phone",   out var ph) ? ph.GetString() ?? "" : "";
    string address = doc.RootElement.TryGetProperty("address", out var a)  ? a.GetString()  ?? "" : "";
    string plan    = doc.RootElement.TryGetProperty("plan",    out var pl) ? pl.GetString() ?? "basic" : "basic";
    int tol        = doc.RootElement.TryGetProperty("offlineToleranceHours", out var tolP) ? tolP.GetInt32() : 48;
    string subnets = doc.RootElement.TryGetProperty("networkSubnets", out var sub) ? sub.GetString() ?? "" : "";
    string snmp    = doc.RootElement.TryGetProperty("snmpCommunity", out var snm) ? snm.GetString() ?? "public" : "public";
    int poll       = doc.RootElement.TryGetProperty("pollInterval", out var pI) ? pI.GetInt32() : 15;

    var client = new Client { 
        Name = name, ClientCode = code, Email = email, Phone = phone, 
        Address = address, Plan = plan, OfflineToleranceHours = tol,
        NetworkSubnets = subnets, SnmpCommunity = snmp, PollInterval = poll
    };
    db.Clients.Add(client);
    await db.SaveChangesAsync();
    return Results.Ok(new { id = client.Id, message = "Cliente criado com sucesso!" });
});

app.MapPut("/api/clients/{id}", async (int id, HttpRequest request, AppDbContext db) =>
{
    var client = await db.Clients.FindAsync(id);
    if (client == null) return Results.NotFound();

    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);

    if (doc.RootElement.TryGetProperty("name",    out var nP))  client.Name        = nP.GetString()  ?? client.Name;
    if (doc.RootElement.TryGetProperty("doc",     out var cP))  client.ClientCode  = cP.GetString()  ?? client.ClientCode;
    if (doc.RootElement.TryGetProperty("email",   out var eP))  client.Email       = eP.GetString()  ?? client.Email;
    if (doc.RootElement.TryGetProperty("phone",   out var pP))  client.Phone       = pP.GetString()  ?? client.Phone;
    if (doc.RootElement.TryGetProperty("address", out var aP))  client.Address     = aP.GetString()  ?? client.Address;
    if (doc.RootElement.TryGetProperty("plan",    out var plP)) client.Plan        = plP.GetString() ?? client.Plan;
    if (doc.RootElement.TryGetProperty("offlineToleranceHours", out var tlP)) client.OfflineToleranceHours = tlP.GetInt32();
    if (doc.RootElement.TryGetProperty("networkSubnets", out var subP)) client.NetworkSubnets = subP.GetString() ?? client.NetworkSubnets;
    if (doc.RootElement.TryGetProperty("snmpCommunity", out var snmP)) client.SnmpCommunity = snmP.GetString() ?? client.SnmpCommunity;
    if (doc.RootElement.TryGetProperty("pollInterval", out var pollP)) client.PollInterval = pollP.GetInt32();

    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Atualizado" });
});

app.MapDelete("/api/clients/{id}", async (int id, AppDbContext db) =>
{
    var client = await db.Clients.FindAsync(id);
    if (client == null) return Results.NotFound();

    db.PrintJobs.RemoveRange(db.PrintJobs.Where(j => j.ClientId == id));
    db.Printers.RemoveRange(db.Printers.Where(p => p.ClientId == id));
    db.Clients.Remove(client);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Excluído." });
});

// ==========================================
// IMPRESSORAS
// ==========================================

app.MapGet("/api/printers/{id}", async (int id, AppDbContext db) =>
{
    var p = await db.Printers.Include(p => p.Client).FirstOrDefaultAsync(x => x.Id == id);
    if (p == null) return Results.NotFound();
    
    var today = DateTime.UtcNow.Date;
    var fourteenDaysAgo = today.AddDays(-13);
    var pJobs = await db.PrintJobs.Where(j => j.PrinterId == p.Id && j.PrintedAt >= fourteenDaysAgo).ToListAsync();
    
    var historyArray = new int[14];
    for (int i = 0; i < 14; i++)
    {
        var date = fourteenDaysAgo.AddDays(i);
        historyArray[i] = pJobs.Where(j => j.PrintedAt.Date == date).Sum(j => j.TotalPages);
    }
    
    return Results.Ok(new
    {
        id = p.Id,
        clientId = p.ClientId,
        clientName = p?.Client?.Name ?? "Desconhecido",
        model = p?.Model,
        ip = p?.IPAddress,
        status = p?.Status,
        toner = p?.TonerLevel,
        drum = p?.DrumLevel,
        isMonitored = p?.IsMonitored ?? false,
        history = historyArray
    });
});

app.MapGet("/api/printers", async (AppDbContext db) =>
{
    var printers = await db.Printers.Include(p => p.Client).ToListAsync();
    var today = DateTime.UtcNow.Date;
    var fourteenDaysAgo = today.AddDays(-13);
    var allRecentJobs = await db.PrintJobs.Where(j => j.PrintedAt >= fourteenDaysAgo).ToListAsync();

    var resultList = new List<object>();
    foreach (var p in printers)
    {
        var pJobs = allRecentJobs.Where(j => j.PrinterId == p.Id).ToList();
        var historyArray = new int[14];
        for (int i = 0; i < 14; i++)
        {
            var date = fourteenDaysAgo.AddDays(i);
            historyArray[i] = pJobs.Where(j => j.PrintedAt.Date == date).Sum(j => j.TotalPages);
        }
        var pToday = pJobs.Where(j => j.PrintedAt.Date == today).Sum(j => j.TotalPages);

        int tolHours = p.Client?.OfflineToleranceHours ?? 48;
        string dynamicStatus = p.Status;
        if (dynamicStatus == "online" && (DateTime.UtcNow - p.LastAccess).TotalHours >= tolHours)
        {
            dynamicStatus = "offline";
        }

        resultList.Add(new {
            id = p.Id, clientId = p.ClientId,
            clientName = p.Client?.Name ?? "Desconhecido",
            model = p.Model, serial = p.SerialNumber,
            ip = p.IPAddress, firmware = p.Firmware,
            status = dynamicStatus,
            pagesTotal = p.PagesTotal + pJobs.Sum(x => x.TotalPages),
            pagesToday = pToday > 0 ? pToday : p.PagesToday,
            lastAccess = p.LastAccess.ToString("o"),
            toner = p.TonerLevel, drum = p.DrumLevel,
            location = p.Location, history = historyArray,
            isMonitored = p.IsMonitored
        });
    }
    return Results.Ok(resultList);
});

// Toggle monitoramento
app.MapPut("/api/printers/{id}/monitor", async (int id, AppDbContext db) =>
{
    var printer = await db.Printers.FindAsync(id);
    if (printer == null) return Results.NotFound();
    printer.IsMonitored = !printer.IsMonitored;
    await db.SaveChangesAsync();
    return Results.Ok(new { isMonitored = printer.IsMonitored, message = printer.IsMonitored ? "Monitoramento ativado" : "Monitoramento desativado" });
});

// Editar IP
app.MapPut("/api/printers/{id}/ip", async (int id, HttpRequest request, AppDbContext db) =>
{
    var printer = await db.Printers.FindAsync(id);
    if (printer == null) return Results.NotFound();

    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);
    string newIp = doc.RootElement.TryGetProperty("ip", out var ipProp) ? ipProp.GetString() ?? "" : "";
    if (string.IsNullOrWhiteSpace(newIp)) return Results.BadRequest("IP inválido.");

    printer.IPAddress = newIp;
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "IP atualizado!" });
});

// Excluir impressora
app.MapDelete("/api/printers/{id}", async (int id, AppDbContext db) =>
{
    var printer = await db.Printers.FindAsync(id);
    if (printer == null) return Results.NotFound();
    db.PrintJobs.RemoveRange(db.PrintJobs.Where(j => j.PrinterId == id));
    db.Printers.Remove(printer);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Impressora removida." });
});

// ==========================================
// SCAN E DOWNLOAD
// ==========================================

// Scan com suporte a IP/faixa manual (corpo opcional)
app.MapPost("/api/admin/force-scan/{clientId}", async (int clientId, AppDbContext db, HttpRequest request) =>
{
    var client = await db.Clients.FindAsync(clientId);
    if (client == null) return Results.NotFound(new { message = "Cliente não encontrado." });

    string command = "SCAN_NETWORK";
    if (request.ContentLength > 0)
    {
        using var reader = new StreamReader(request.Body);
        var body = await reader.ReadToEndAsync();
        if (!string.IsNullOrWhiteSpace(body))
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("ip", out var ipElement))
            {
                var target = ipElement.GetString()?.Trim();
                if (string.IsNullOrWhiteSpace(target) || !(System.Net.IPAddress.TryParse(target, out _) || Regex.IsMatch(target, @"^\d{1,3}\.\d{1,3}\.\d{1,3}$")))
                    return Results.BadRequest(new { message = "Informe um IP ou prefixo IPv4 válido." });
                command = $"SCAN_IP:{target}";
            }
        }
    }

    db.PendingAgentCommands.Add(new PendingAgentCommand { ClientId = clientId, Command = command });
    await db.SaveChangesAsync();
    return Results.Accepted($"/api/agent/{clientId}/commands", new { message = "Varredura adicionada à fila do agente.", command });
});

app.MapPost("/api/printers/approve", async (List<ApprovePrinterRequest> reqs, AppDbContext db) =>
{
    int added = 0;
    foreach (var req in reqs)
    {
        if (req.IsMonitored)
        {
            var exists = await db.Printers.AnyAsync(p => p.ClientId == req.ClientId && p.IPAddress == req.IPAddress);
            if (!exists)
            {
                db.Printers.Add(new Printer
                {
                    ClientId = req.ClientId,
                    IPAddress = req.IPAddress,
                    Model = req.Model,
                    Status = "online",
                    TonerLevel = 100,
                    IsMonitored = true,
                    DiscoveredAt = DateTime.UtcNow
                });
                added++;
            }
        }
    }
    if (added > 0) await db.SaveChangesAsync();
    return Results.Ok(new { message = $"{added} impressoras aprovadas e monitoradas." });
});

// Enviar comando de desinstalação para o agente
app.MapPost("/api/admin/uninstall-agent/{clientId}", async (int clientId, AppDbContext db) =>
{
    if (!await db.Clients.AnyAsync(c => c.Id == clientId)) return Results.NotFound();
    db.PendingAgentCommands.Add(new PendingAgentCommand { ClientId = clientId, Command = "UNINSTALL" });
    await db.SaveChangesAsync();
    return Results.Accepted($"/api/agent/{clientId}/commands", new { message = "Desinstalação adicionada à fila do agente." });
});

app.MapGet("/api/clients/{id}/download-agent", async (HttpRequest request, int id, AppDbContext db, IWebHostEnvironment environment, IConfiguration configuration) =>
{
    var client = await db.Clients.FindAsync(id);
    if (client == null) return Results.NotFound(new { message = "Cliente não encontrado." });

    var agentExe = Environment.GetEnvironmentVariable("PRINT_CONTROL_AGENT_EXE")
        ?? configuration["Agent:ExecutablePath"]
        ?? Path.GetFullPath(Path.Combine(environment.ContentRootPath, "AgentPublish", "Agent.exe"));
    if (!File.Exists(agentExe))
        return Results.Problem("Agente ainda não publicado. Execute o script de publicação documentado no README.", statusCode: StatusCodes.Status503ServiceUnavailable);

    var agentToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    client.AgentTokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(agentToken)));
    await db.SaveChangesAsync();

    byte[] baseBytes = await File.ReadAllBytesAsync(agentExe);
    var serverUrl = $"{request.Scheme}://{request.Host.Value}";
    var configJson = JsonSerializer.Serialize(new { ClientId = id, ServerUrl = serverUrl, AgentToken = agentToken });
    var configPayload = "___PRINT_AGENT_CONFIG:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(configJson)) + "___";
    byte[] configBytes = Encoding.UTF8.GetBytes(configPayload);
    byte[] finalBytes = new byte[baseBytes.Length + configBytes.Length];
    Buffer.BlockCopy(baseBytes, 0, finalBytes, 0, baseBytes.Length);
    Buffer.BlockCopy(configBytes, 0, finalBytes, baseBytes.Length, configBytes.Length);

    return Results.File(finalBytes, "application/vnd.microsoft.portable-executable", "Agent_Setup.exe");
});

// ==========================================
// TRABALHOS DE IMPRESSÃO (Relatórios)
// ==========================================

app.MapGet("/api/printjobs", async (AppDbContext db) =>
{
    var jobs = await db.PrintJobs
        .Include(j => j.Client)
        .Include(j => j.Printer)
        .OrderByDescending(j => j.PrintedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(jobs.Select(j => new {
        id = j.Id,
        clientId = j.ClientId,
        clientName = j.Client?.Name ?? "Desconhecido",
        printerModel = j.Printer?.Model ?? "Desconhecida",
        printerIp = j.Printer?.IPAddress ?? "-",
        documentName = j.DocumentName,
        userName = j.UserName,
        totalPages = j.TotalPages,
        printedAt = j.PrintedAt.ToString("o") // ISO 8601
    }));
});

app.MapGet("/api/clients/{id}/jobs", async (int id, AppDbContext db) =>
{
    var jobs = await db.PrintJobs
        .Include(j => j.Printer)
        .Where(j => j.ClientId == id)
        .OrderByDescending(j => j.PrintedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(jobs.Select(j => new {
        id = j.Id,
        clientId = j.ClientId,
        printerModel = j.Printer?.Model ?? "Desconhecida",
        printerIp = j.Printer?.IPAddress ?? "-",
        documentName = j.DocumentName,
        userName = j.UserName,
        userIp = j.UserIp,
        totalPages = j.TotalPages,
        printedAt = j.PrintedAt.ToString("o")
    }));
});

// ==========================================
// AGENTE — COMUNICAÇÃO
// ==========================================

// Heartbeat: agente bate ponto a cada 30s
app.MapPost("/api/agent/heartbeat", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);
    if (doc.RootElement.TryGetProperty("ClientId", out var idProp))
    {
        int clientId = idProp.GetInt32();
        if (!int.TryParse(request.Headers["X-Agent-Client"], out var authenticatedClientId) || authenticatedClientId != clientId)
            return Results.Forbid();
        string hostname = doc.RootElement.TryGetProperty("Hostname", out var hProp) ? hProp.GetString() ?? "Unknown" : "Unknown";
        
        var hosts = agentHeartbeats.GetOrAdd(clientId, _ => new ConcurrentDictionary<string, DateTime>());
        hosts[hostname] = DateTime.UtcNow;
        
        Console.WriteLine($"[HEARTBEAT] Cliente {clientId} ({hostname}) está online — {DateTime.UtcNow:HH:mm:ss}");
    }
    return Results.Ok();
});

app.MapGet("/api/agents", async (AppDbContext db) =>
{
    var clients = await db.Clients.OrderBy(c => c.Name).ToListAsync();
    var result = new List<object>();
    foreach (var client in clients)
    {
        var hosts = new List<object>();
        bool isOnline = false;
        string? lastSeen = null;
        if (agentHeartbeats.TryGetValue(client.Id, out var snapshots))
        {
            var ordered = snapshots.OrderByDescending(entry => entry.Value).ToList();
            lastSeen = ordered.FirstOrDefault().Value.ToString("o");
            foreach (var entry in ordered)
            {
                bool hostOnline = (DateTime.UtcNow - entry.Value).TotalSeconds < 90;
                isOnline |= hostOnline;
                hosts.Add(new { hostname = entry.Key, lastSeen = entry.Value.ToString("o"), isOnline = hostOnline });
            }
        }
        result.Add(new { clientId = client.Id, clientName = client.Name, networkSubnets = client.NetworkSubnets, isOnline, lastSeen, hosts });
    }
    return Results.Ok(result);
});

// Status do agente por cliente
app.MapGet("/api/agent/{clientId}/status", (int clientId) =>
{
    if (agentHeartbeats.TryGetValue(clientId, out var hosts))
    {
        var activeHosts = hosts.Select(kv => {
            var cfg = GetOrCreateAgentRoleConfig(clientId, kv.Key);
            return new {
                hostname = kv.Key,
                lastSeen = kv.Value.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                isOnline = (DateTime.UtcNow - kv.Value).TotalSeconds < 90,
                isScannerEnabled = cfg.IsScannerEnabled,
                isSpoolerEnabled = cfg.IsSpoolerEnabled
            };
        }).ToList();
        
        bool anyOnline = activeHosts.Any(h => h.isOnline);
        return Results.Ok(new {
            isOnline = anyOnline,
            lastSeen = activeHosts.OrderByDescending(h => h.lastSeen).FirstOrDefault()?.lastSeen,
            hosts = activeHosts
        });
    }
    return Results.Ok(new { isOnline = false, lastSeen = (string?)null, hosts = new object[]{} });
});

// Comandos pendentes para o agente
app.MapGet("/api/agent/{clientId}/commands", async (int clientId, HttpRequest req, AppDbContext db) =>
{
    var hostname = req.Query["hostname"].ToString();
    var cfg = string.IsNullOrWhiteSpace(hostname)
        ? new AgentRoleConfig()
        : GetOrCreateAgentRoleConfig(clientId, hostname);

    var leaseExpiredAt = DateTime.UtcNow.AddMinutes(-1);
    var pending = await db.PendingAgentCommands
        .Where(c => c.ClientId == clientId && c.AcknowledgedAt == null &&
            (c.Hostname == null || c.Hostname == hostname) &&
            (c.DeliveredAt == null || c.DeliveredAt <= leaseExpiredAt))
        .OrderBy(c => c.CreatedAt)
        .FirstOrDefaultAsync();

    // A non-scanner must not consume a network scan intended for another agent.
    if (pending != null && (pending.Command == "SCAN_NETWORK" || pending.Command.StartsWith("SCAN_IP:")) && !cfg.IsScannerEnabled)
        pending = null;

    string command = "IDLE";
    int commandId = 0;
    if (pending != null)
    {
        var deliveredAt = DateTime.UtcNow;
        var claimed = await db.PendingAgentCommands
            .Where(c => c.Id == pending.Id && c.AcknowledgedAt == null &&
                (c.DeliveredAt == null || c.DeliveredAt <= leaseExpiredAt))
            .ExecuteUpdateAsync(update => update
                .SetProperty(c => c.DeliveredAt, deliveredAt)
                .SetProperty(c => c.Attempts, c => c.Attempts + 1)
                .SetProperty(c => c.Hostname, string.IsNullOrWhiteSpace(hostname) ? null : hostname));
        if (claimed > 0)
        {
            command = pending.Command;
            commandId = pending.Id;
        }
    }

    var client = await db.Clients.FindAsync(clientId);
    return Results.Json(new {
        Command = command,
        CommandId = commandId,
        IsScannerEnabled = cfg.IsScannerEnabled,
        IsSpoolerEnabled = cfg.IsSpoolerEnabled,
        NetworkSubnets = client?.NetworkSubnets ?? string.Empty,
        SnmpCommunity = client?.SnmpCommunity ?? "public",
        PollInterval = client?.PollInterval ?? 15
    });
});

app.MapPost("/api/agent/{clientId}/commands/{commandId:int}/ack", async (int clientId, int commandId, HttpRequest req, AppDbContext db) =>
{
    if (!int.TryParse(req.Headers["X-Agent-Client"], out var authenticatedClientId) || authenticatedClientId != clientId)
        return Results.Forbid();

    var command = await db.PendingAgentCommands.FirstOrDefaultAsync(c => c.Id == commandId && c.ClientId == clientId);
    if (command == null) return Results.NotFound(new { message = "Comando não encontrado." });

    using var reader = new StreamReader(req.Body);
    var body = await reader.ReadToEndAsync();
    using var doc = JsonDocument.Parse(body);
    var succeeded = doc.RootElement.TryGetProperty("Succeeded", out var succeededElement) && succeededElement.GetBoolean();
    if (succeeded)
    {
        command.AcknowledgedAt ??= DateTime.UtcNow;
        command.LastError = null;
    }
    else
    {
        command.DeliveredAt = DateTime.UtcNow;
        var error = doc.RootElement.TryGetProperty("Error", out var errorElement) ? errorElement.GetString() : null;
        command.LastError = string.IsNullOrWhiteSpace(error) ? "Agent reported command failure." : error[..Math.Min(error.Length, 1000)];
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { acknowledged = succeeded });
});
// Update agent config
app.MapPut("/api/agent/{clientId}/{hostname}/config", async (int clientId, string hostname, HttpRequest request) => {
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);
    bool isScanner = doc.RootElement.GetProperty("isScannerEnabled").GetBoolean();
    bool isSpooler = doc.RootElement.GetProperty("isSpoolerEnabled").GetBoolean();
    
    var cfg = GetOrCreateAgentRoleConfig(clientId, hostname);
    cfg.IsScannerEnabled = isScanner;
    cfg.IsSpoolerEnabled = isSpooler;
    return Results.Ok();
});

// Recebe relatório de impressoras descobertas pelo agente
app.MapPost("/api/agent/report-printers", async (HttpRequest request, AppDbContext db) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);

    int clientId = doc.RootElement.GetProperty("ClientId").GetInt32();
    if (!int.TryParse(request.Headers["X-Agent-Client"], out var authenticatedClientId) || authenticatedClientId != clientId)
        return Results.Forbid();
    var printersArr = doc.RootElement.GetProperty("Printers").EnumerateArray().ToList();
    var scannedIps = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    if (doc.RootElement.TryGetProperty("ScannedIps", out var scannedIpsElement) && scannedIpsElement.ValueKind == JsonValueKind.Array)
    {
        foreach (var scannedIp in scannedIpsElement.EnumerateArray())
        {
            if (scannedIp.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(scannedIp.GetString()))
                scannedIps.Add(scannedIp.GetString()!);
        }
    }
    if (scannedIps.Count > 4096)
        return Results.BadRequest(new { message = "Scan contains too many addresses." });

    // Only mark printers in this scan's IP range offline. Legacy agents that do not
    // send ScannedIps do not change offline state for printers outside the report.
    var existingPrinters = await db.Printers.Where(x => x.ClientId == clientId).ToListAsync();
    foreach (var ep in existingPrinters)
    {
        if (scannedIps.Contains(ep.IPAddress))
            ep.Status = "offline";
    }

    int newPrinters = 0;
    foreach (var p in printersArr)
    {
        string ip     = p.TryGetProperty("IP",     out var ipP)    ? ipP.GetString()    ?? "" : "";
        string model  = p.TryGetProperty("Model",  out var modelP) ? modelP.GetString() ?? "Desconhecida" : "Desconhecida";
        string status = p.TryGetProperty("Status", out var statP)  ? statP.GetString()  ?? "offline" : "offline";
        int pages     = p.TryGetProperty("PagesTotal", out var pgP) ? pgP.GetInt32() : 0;
        string serial = p.TryGetProperty("SerialNumber", out var serP) ? serP.GetString() ?? "N/A" : "N/A";
        string fw     = p.TryGetProperty("Firmware", out var fwP) ? fwP.GetString() ?? "Desconhecido" : "Desconhecido";
        int? toner    = p.TryGetProperty("TonerLevel", out var tnrP) && tnrP.ValueKind != JsonValueKind.Null ? tnrP.GetInt32() : null;
        int? drum     = p.TryGetProperty("DrumLevel", out var drP) && drP.ValueKind != JsonValueKind.Null ? drP.GetInt32() : null;

        var dbPrinter = await db.Printers.FirstOrDefaultAsync(x => x.ClientId == clientId && x.IPAddress == ip);
        if (dbPrinter == null)
        {
            db.Printers.Add(new Printer {
                ClientId = clientId, IPAddress = ip, Model = model,
                IsMonitored = false, Status = status, LastAccess = DateTime.UtcNow,
                PagesTotal = pages, SerialNumber = serial, Firmware = fw,
                TonerLevel = toner, DrumLevel = drum
            });
            newPrinters++;
        }
        else
        {
            dbPrinter.Status = status;
            dbPrinter.LastAccess = DateTime.UtcNow;
            if (model != "Desconhecida" && dbPrinter.Model == "Desconhecida") dbPrinter.Model = model;
            if (pages > 0) dbPrinter.PagesTotal = pages;
            if (serial != "N/A") dbPrinter.SerialNumber = serial;
            if (fw != "Desconhecido") dbPrinter.Firmware = fw;
            if (toner.HasValue) dbPrinter.TonerLevel = toner;
            if (drum.HasValue) dbPrinter.DrumLevel = drum;
        }
    }
    await db.SaveChangesAsync();
    Console.WriteLine($"[SERVIDOR] {printersArr.Count} impressoras reportadas pelo Cliente {clientId}. {newPrinters} novas.");
    return Results.Ok(new { message = "OK", newPrinters });
});

// Recebe trabalho de impressão do agente
app.MapPost("/api/agent/report-job", async (HttpRequest request, AppDbContext db) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);

    int clientId  = doc.RootElement.GetProperty("ClientId").GetInt32();
    if (!int.TryParse(request.Headers["X-Agent-Client"], out var authenticatedClientId) || authenticatedClientId != clientId)
        return Results.Forbid();
    string model  = doc.RootElement.TryGetProperty("PrinterModel",  out var mP) ? mP.GetString()  ?? "" : "";
    string docName= doc.RootElement.TryGetProperty("DocumentName",  out var dP) ? dP.GetString()  ?? "" : "";
    string user   = doc.RootElement.TryGetProperty("UserName",      out var uP) ? uP.GetString()  ?? "" : "";
    string userIp = doc.RootElement.TryGetProperty("UserIp",        out var ipP)? ipP.GetString() ?? "" : "";
    int pages     = doc.RootElement.TryGetProperty("TotalPages",    out var pP) ? pP.GetInt32() : 0;

if (pages < 0) return Results.BadRequest(new { message = "TotalPages must be zero or greater." });
    Printer? printer = null;
    if (!string.IsNullOrWhiteSpace(model))
    {
        var candidates = await db.Printers
            .Where(p => p.ClientId == clientId && p.Model.Contains(model.Trim()))
            .Take(2)
            .ToListAsync();
        if (candidates.Count == 1)
            printer = candidates[0];
    }

    db.PrintJobs.Add(new PrintJob {
        ClientId = clientId,
        PrinterId = printer?.Id,
        DocumentName = docName,
        UserName = user,
        UserIp = userIp,
        TotalPages = pages
    });

    // Atualiza cota do usuário se existir
    var quota = await db.UserQuotas.FirstOrDefaultAsync(q => q.ClientId == clientId && q.UserName.ToLower() == user.ToLower());
    if (quota != null)
    {
        quota.PagesUsed += pages;
        // O bloqueio ativo é feito no agente. Aqui apenas registramos o uso.
    }

    await db.SaveChangesAsync();
    return Results.Ok();
});

// ==========================================
// COTAS E LIMITES DE IMPRESSÃO
// ==========================================

app.MapGet("/api/quotas/{clientId}", async (int clientId, AppDbContext db) =>
{
    var quotas = await db.UserQuotas.Where(q => q.ClientId == clientId).ToListAsync();
    return Results.Ok(quotas);
});

app.MapPost("/api/quotas", async (HttpRequest request, AppDbContext db) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);
    
    int clientId = doc.RootElement.GetProperty("clientId").GetInt32();
    string user = doc.RootElement.GetProperty("userName").GetString() ?? "";
    int maxPages = doc.RootElement.GetProperty("maxPages").GetInt32();
    bool isBlocked = doc.RootElement.GetProperty("isBlocked").GetBoolean();

    var quota = await db.UserQuotas.FirstOrDefaultAsync(q => q.ClientId == clientId && q.UserName.ToLower() == user.ToLower());
    if (quota == null)
    {
        quota = new UserQuota { ClientId = clientId, UserName = user, MaxPages = maxPages, IsBlocked = isBlocked, PagesUsed = 0 };
        db.UserQuotas.Add(quota);
    }
    else
    {
        quota.MaxPages = maxPages;
        quota.IsBlocked = isBlocked;
    }
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Cota atualizada." });
});

app.MapDelete("/api/quotas/{id}", async (int id, AppDbContext db) =>
{
    var q = await db.UserQuotas.FindAsync(id);
    if (q != null) { db.UserQuotas.Remove(q); await db.SaveChangesAsync(); }
    return Results.Ok();
});

app.MapGet("/api/agent/{clientId}/quotas", async (int clientId, AppDbContext db) =>
{
    var quotas = await db.UserQuotas.Where(q => q.ClientId == clientId).Select(q => new {
        q.UserName, q.MaxPages, q.PagesUsed, q.IsBlocked
    }).ToListAsync();
    return Results.Ok(quotas);
});



app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/admin/health", () => Results.Ok(new { status = "ok" }));

static bool SecretsMatch(string provided, string expected)
{
    var left = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
    var right = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
    return CryptographicOperations.FixedTimeEquals(left, right);
}

app.Run("http://0.0.0.0:5000");

public class AgentRoleConfig {
    public bool IsScannerEnabled { get; set; } = false;
    public bool IsSpoolerEnabled { get; set; } = true;
}

public class ApprovePrinterRequest
{
    public int ClientId { get; set; }
    public string IPAddress { get; set; } = "";
    public string Model { get; set; } = "";
    public bool IsMonitored { get; set; } = true;
}
