namespace AetherLux.Domain.Entities;

public class Device
{
    public long Id { get; set; }
    public string Hostname { get; set; } = null!;
    public string MachineName { get; set; } = null!;
    public string Category { get; set; } = "Desktop";
    public bool Online { get; set; }
    public string Status { get; set; } = "Offline";
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? OperatingSystem { get; set; }
    public string? AgentVersion { get; set; }
    public long TenantId { get; set; }
    public long? CompanyId { get; set; }
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

