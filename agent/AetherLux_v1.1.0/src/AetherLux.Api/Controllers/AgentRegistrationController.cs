using System.IdentityModel.Tokens.Jwt;
using System.Text;
using AetherLux.Domain.Entities;
using AetherLux.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using AetherLux.Api.Hubs;

namespace AetherLux.Api.Controllers;

[ApiController]
[Route("api/agent")]
public class AgentRegistrationController : ControllerBase
{
    private readonly AetherLuxDbContext _db;
    private readonly IConfiguration _config;
    private readonly IHubContext<AgentHub> _hub;

    public AgentRegistrationController(AetherLuxDbContext db, IConfiguration config, IHubContext<AgentHub> hub)
    {
        _db = db;
        _config = config;
        _hub = hub;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AgentRegisterRequest req)
    {
        // Validate token
        var tokenHandler = new JwtSecurityTokenHandler();
        var secret = _config["JwtSettings:Secret"] ?? throw new InvalidOperationException("Missing secret");
        var key = Encoding.UTF8.GetBytes(secret);

        try
        {
            var principal = tokenHandler.ValidateToken(req.InstallationToken, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _config["JwtSettings:Issuer"],
                ValidateAudience = true,
                ValidAudience = _config["JwtSettings:Audience"],
                ValidateLifetime = true
            }, out var validatedToken);

            var tenantIdClaim = principal.FindFirst("tenant_id")?.Value;
            var companyIdClaim = principal.FindFirst("company_id")?.Value;

            if (!long.TryParse(tenantIdClaim, out var tenantId)) return BadRequest("Invalid tenant in token");
            long.TryParse(companyIdClaim, out var companyId);

            // Upsert device
            var device = _db.Devices.FirstOrDefault(d => d.MachineName == req.MachineName && d.TenantId == tenantId);
            if (device == null)
            {
                device = new Device
                {
                    Hostname = req.Hostname,
                    MachineName = req.MachineName,
                    IpAddress = req.IpAddress,
                    MacAddress = req.MacAddress,
                    OperatingSystem = req.OperatingSystem,
                    AgentVersion = req.AgentVersion,
                    TenantId = tenantId,
                    CompanyId = companyId > 0 ? companyId : null,
                    Online = true,
                    Status = "online",
                    LastSeen = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.Devices.Add(device);
            }
            else
            {
                device.Hostname = req.Hostname;
                device.IpAddress = req.IpAddress;
                device.MacAddress = req.MacAddress;
                device.OperatingSystem = req.OperatingSystem;
                device.AgentVersion = req.AgentVersion;
                device.Online = true;
                device.Status = "online";
                device.LastSeen = DateTime.UtcNow;
                device.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            // Broadcast via SignalR
            await _hub.Clients.All.SendAsync("AgentRegistered", new { device.Id, device.Hostname, device.MachineName, device.TenantId });

            // Audit
            _db.AuditLogs.Add(new Domain.Entities.AuditLog
            {
                Action = "Agent.Register",
                Entity = "Device",
                EntityId = device.Id,
                Details = System.Text.Json.JsonSerializer.Serialize(req),
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return Ok(new { device.Id });
        }
        catch (SecurityTokenException ex)
        {
            return Unauthorized(new { error = "Invalid installation token", details = ex.Message });
        }
    }
}

public record AgentRegisterRequest(
    string InstallationToken,
    string Hostname,
    string MachineName,
    string IpAddress,
    string MacAddress,
    string OperatingSystem,
    string AgentVersion
);
