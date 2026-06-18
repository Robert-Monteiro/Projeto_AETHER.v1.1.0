using AetherLux.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AetherLux.Infrastructure.Persistence;

public class AetherLuxDbContext : DbContext
{
    public AetherLuxDbContext(DbContextOptions<AetherLuxDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Email).IsRequired().HasMaxLength(255);
            entity.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(x => x.LastName).IsRequired().HasMaxLength(100);
            entity.Property(x => x.Role).IsRequired().HasMaxLength(50);
            entity.Property(x => x.TenantId).IsRequired();
            entity.HasIndex(x => x.TenantId);
        });

        modelBuilder.Entity<Device>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Hostname).IsRequired().HasMaxLength(255);
            entity.Property(x => x.MachineName).IsRequired().HasMaxLength(255);
            entity.Property(x => x.Status).HasMaxLength(50);
            entity.Property(x => x.Category).HasMaxLength(50);
            entity.Property(x => x.TenantId).IsRequired();
            entity.HasIndex(x => x.TenantId);
            entity.HasIndex(x => x.MachineName);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Action).IsRequired().HasMaxLength(150);
            entity.Property(x => x.Details).HasColumnType("jsonb");
        });
    }
}
