using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace ServerMock.Models
{
    public class Client
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ClientCode { get; set; } = string.Empty; 
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Plan { get; set; } = "basic"; // basic, pro, enterprise
        public int OfflineToleranceHours { get; set; } = 48; // Tempo de tolerância para falso offline
        
        public string NetworkSubnets { get; set; } = string.Empty; // ex: 192.168.1.0/24
        public string SnmpCommunity { get; set; } = "public";
        public int PollInterval { get; set; } = 15; // em minutos
        
        public List<Printer> Printers { get; set; } = new();
        public List<PrintJob> PrintJobs { get; set; } = new();
    }

    public class Printer
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public string IPAddress { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public bool IsMonitored { get; set; } = false;
        public DateTime DiscoveredAt { get; set; } = DateTime.UtcNow;

        // Novas colunas avançadas
        public string Status { get; set; } = "offline"; // online, offline, warning
        public int? TonerLevel { get; set; } = null; // null = N/A
        public int? DrumLevel { get; set; } = null;
        public int PagesTotal { get; set; } = 0;
        public int PagesToday { get; set; } = 0;
        public string Firmware { get; set; } = "Desconhecido";
        public string SerialNumber { get; set; } = "N/A";
        public string Location { get; set; } = string.Empty;
        public DateTime LastAccess { get; set; } = DateTime.UtcNow;

        public Client? Client { get; set; }
    }

    public class PrintJob
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public int? PrinterId { get; set; }
        public string DocumentName { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string UserIp { get; set; } = string.Empty;
        public int TotalPages { get; set; }
        public DateTime PrintedAt { get; set; } = DateTime.UtcNow;

        public Client? Client { get; set; }
        public Printer? Printer { get; set; }
    }

    public class UserQuota
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int MaxPages { get; set; } = 0; // 0 = Sem limite
        public int PagesUsed { get; set; } = 0;
        public bool IsBlocked { get; set; } = false;

        public Client? Client { get; set; }
    }

    public class AppDbContext : DbContext
    {
        public DbSet<Client> Clients => Set<Client>();
        public DbSet<Printer> Printers => Set<Printer>();
        public DbSet<PrintJob> PrintJobs => Set<PrintJob>();
        public DbSet<UserQuota> UserQuotas => Set<UserQuota>();

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
