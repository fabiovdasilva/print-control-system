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
using ServerMock.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=printcontrol.db"));

var app = builder.Build();

app.UseCors("AllowAll");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    try {
        db.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS UserQuotas (Id INTEGER NOT NULL CONSTRAINT PK_UserQuotas PRIMARY KEY AUTOINCREMENT, ClientId INTEGER NOT NULL, UserName TEXT NOT NULL, MaxPages INTEGER NOT NULL, PagesUsed INTEGER NOT NULL, IsBlocked INTEGER NOT NULL, CONSTRAINT FK_UserQuotas_Clients_ClientId FOREIGN KEY (ClientId) REFERENCES Clients (Id) ON DELETE CASCADE)");
    } catch { }
}

// Dicionários em memória (sem precisar de DB extra)
ConcurrentDictionary<int, string> pendingCommands = new();
ConcurrentDictionary<int, DateTime> agentHeartbeats = new();

// ==========================================
// CLIENTES
// ==========================================

app.MapGet("/api/clients", async (AppDbContext db) =>
{
    var clients = await db.Clients.ToListAsync();
    return Results.Ok(clients.Select(c => new {
        id = c.Id, name = c.Name, doc = c.ClientCode,
        email = c.Email, phone = c.Phone,
        address = c.Address, plan = c.Plan
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

    var client = new Client { Name = name, ClientCode = code, Email = email, Phone = phone, Address = address, Plan = plan };
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

        resultList.Add(new {
            id = p.Id, clientId = p.ClientId,
            clientName = p.Client?.Name ?? "Desconhecido",
            model = p.Model, serial = p.SerialNumber,
            ip = p.IPAddress, firmware = p.Firmware,
            status = p.Status,
            pagesTotal = p.PagesTotal + pJobs.Sum(x => x.TotalPages),
            pagesToday = pToday > 0 ? pToday : p.PagesToday,
            lastAccess = p.LastAccess.ToString("dd/MM HH:mm"),
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
app.MapPost("/api/admin/force-scan/{clientId}", async (int clientId, HttpRequest request) =>
{
    string customIp = "";
    try
    {
        if (request.ContentLength > 0)
        {
            using var reader = new StreamReader(request.Body);
            var body = await reader.ReadToEndAsync();
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("customIp", out var ipProp))
                customIp = ipProp.GetString()?.Trim() ?? "";
        }
    }
    catch { }

    string command = string.IsNullOrEmpty(customIp)
        ? "SCAN_NETWORK"
        : $"SCAN_IP:{customIp}";

    pendingCommands[clientId] = command;
    return Results.Ok(new { message = string.IsNullOrEmpty(customIp)
        ? "Varredura automática enviada ao agente!"
        : $"Scan forçado no IP {customIp} enviado ao agente!" });
});

// Enviar comando de desinstalação para o agente
app.MapPost("/api/admin/uninstall-agent/{clientId}", (int clientId) =>
{
    pendingCommands[clientId] = "UNINSTALL";
    return Results.Ok(new { message = "Comando de desinstalação enviado ao agente!" });
});

app.MapGet("/api/clients/{id}/download-agent", async (HttpRequest request, int id) =>
{
    string agentExe = @"C:\print_agent\Agent\bin\Release\net8.0-windows\win-x64\publish\Agent.exe";
    if (!File.Exists(agentExe)) return Results.BadRequest("Base do Agente não encontrada. Compile com: dotnet publish Agent -r win-x64");

    byte[] baseBytes = await File.ReadAllBytesAsync(agentExe);
    string serverUrl = $"{request.Scheme}://{request.Host.Value}";
    string configPayload = $"___PRINT_AGENT_CLIENT_ID:{id}|{serverUrl}___";
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
        clientName = j.Client?.Name ?? "Desconhecido",
        printerModel = j.Printer?.Model ?? "Desconhecida",
        printerIp = j.Printer?.IPAddress ?? "-",
        documentName = j.DocumentName,
        userName = j.UserName,
        totalPages = j.TotalPages,
        printedAt = j.PrintedAt.ToString("dd/MM/yyyy HH:mm:ss")
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
        printerModel = j.Printer?.Model ?? "Desconhecida",
        printerIp = j.Printer?.IPAddress ?? "-",
        documentName = j.DocumentName,
        userName = j.UserName,
        userIp = j.UserIp,
        totalPages = j.TotalPages,
        printedAt = j.PrintedAt.ToString("dd/MM/yyyy HH:mm:ss")
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
        agentHeartbeats[clientId] = DateTime.UtcNow;
        Console.WriteLine($"[HEARTBEAT] Cliente {clientId} está online — {DateTime.UtcNow:HH:mm:ss}");
    }
    return Results.Ok();
});

// Status do agente por cliente
app.MapGet("/api/agent/{clientId}/status", (int clientId) =>
{
    if (agentHeartbeats.TryGetValue(clientId, out DateTime lastSeen))
    {
        bool isOnline = (DateTime.UtcNow - lastSeen).TotalSeconds < 90; // 90s de tolerância
        return Results.Ok(new {
            isOnline,
            lastSeen = lastSeen.ToString("dd/MM/yyyy HH:mm:ss"),
            secondsAgo = (int)(DateTime.UtcNow - lastSeen).TotalSeconds
        });
    }
    return Results.Ok(new { isOnline = false, lastSeen = (string?)null, secondsAgo = -1 });
});

// Comandos pendentes para o agente
app.MapGet("/api/agent/{clientId}/commands", (int clientId) =>
{
    string cmd = "IDLE";
    if (pendingCommands.TryGetValue(clientId, out string? pendingCmd) && pendingCmd != null)
    {
        cmd = pendingCmd;
        pendingCommands.TryRemove(clientId, out _);
    }
    return Results.Json(new { Command = cmd });
});

// Recebe relatório de impressoras descobertas pelo agente
app.MapPost("/api/agent/report-printers", async (HttpRequest request, AppDbContext db) =>
{
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);

    int clientId = doc.RootElement.GetProperty("ClientId").GetInt32();
    var printersArr = doc.RootElement.GetProperty("Printers").EnumerateArray().ToList();

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
    string model  = doc.RootElement.TryGetProperty("PrinterModel",  out var mP) ? mP.GetString()  ?? "" : "";
    string docName= doc.RootElement.TryGetProperty("DocumentName",  out var dP) ? dP.GetString()  ?? "" : "";
    string user   = doc.RootElement.TryGetProperty("UserName",      out var uP) ? uP.GetString()  ?? "" : "";
    string userIp = doc.RootElement.TryGetProperty("UserIp",        out var ipP)? ipP.GetString() ?? "" : "";
    int pages     = doc.RootElement.TryGetProperty("TotalPages",    out var pP) ? pP.GetInt32() : 0;

    var printer = await db.Printers.FirstOrDefaultAsync(p => p.ClientId == clientId && (p.Model == model || p.Model.Contains(model)));

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

// ==========================================
// MONITORAMENTO DE IMPRESSORAS
// ==========================================
app.MapPut("/api/printers/{id}/monitor", async (int id, HttpRequest request, AppDbContext db) =>
{
    var printer = await db.Printers.FindAsync(id);
    if (printer == null) return Results.NotFound();
    
    using var reader = new StreamReader(request.Body);
    var body = await reader.ReadToEndAsync();
    using JsonDocument doc = JsonDocument.Parse(body);
    if (doc.RootElement.TryGetProperty("isMonitored", out var monProp))
    {
        printer.IsMonitored = monProp.GetBoolean();
        await db.SaveChangesAsync();
    }
    return Results.Ok();
});

app.Run("http://0.0.0.0:5000");
