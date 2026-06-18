using AetherLux.Infrastructure.Persistence;
using AetherLux.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Linq;

namespace AetherLux.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevicesController : ControllerBase
{
    private readonly AetherLuxDbContext _dbContext;

    public DevicesController(AetherLuxDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize]
    public IActionResult GetAll()
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (!long.TryParse(tenantIdClaim, out var tenantId))
        {
            return Forbid();
        }

        var devices = _dbContext.Devices.Where(d => d.TenantId == tenantId).ToList();
        return Ok(devices);
    }

    [HttpPost]
    public IActionResult Create(Device device)
    {
        device.CreatedAt = DateTime.UtcNow;
        device.UpdatedAt = DateTime.UtcNow;
        _dbContext.Devices.Add(device);
        _dbContext.SaveChanges();

        return CreatedAtAction(nameof(GetById), new { id = device.Id }, device);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(long id)
    {
        var device = _dbContext.Devices.Find(id);
        if (device == null)
            return NotFound();

        return Ok(device);
    }
}
