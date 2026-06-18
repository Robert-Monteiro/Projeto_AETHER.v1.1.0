using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AetherLux.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IO.Compression;

namespace AetherLux.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InstallerController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public InstallerController(IWebHostEnvironment env, IConfiguration configuration)
    {
        _env = env;
        _configuration = configuration;
    }

    [HttpPost("generate")]
    [Authorize]
    public IActionResult GenerateInstaller([FromBody] GenerateInstallerRequest request)
    {
        // Get current user claims
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0";
        var tenantId = User.FindFirstValue("tenant_id") ?? request.TenantId.ToString();

        // Create JWT installation token
        var secret = _configuration["JwtSettings:Secret"] ?? throw new InvalidOperationException("Missing JWT secret");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[] {
            new Claim("tenant_id", tenantId),
            new Claim("company_id", request.CompanyId.ToString()),
            new Claim("installer_user_id", userId)
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.WriteToken(new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(6),
            signingCredentials: creds
        ));

        // Build installer package (zip)
        var outputDir = Path.Combine(_env.ContentRootPath, "installer", "output");
        Directory.CreateDirectory(outputDir);
        var fileId = Guid.NewGuid().ToString("N");
        var filename = $"AetherLuxSetup_{tenantId}_{fileId}.zip";
        var zipPath = Path.Combine(outputDir, filename);

        // Source agent binary (use existing LuxAgent.exe in repo if available)
        var repoAgentPath = Path.Combine(_env.ContentRootPath, "..", "..", "..", "..", "agent", "LuxAgent.exe");
        if (!System.IO.File.Exists(repoAgentPath))
        {
            // Fallback: create a small placeholder launcher
            repoAgentPath = null!;
        }

        using (var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create))
        {
            // agent_config.json
            var config = new {
                ServerUrl = _configuration["Agent:WebSocketUrl"],
                ApiBase = _configuration["ConnectionStrings:ApiBase"] ?? "http://localhost:5000",
                InstallationToken = token
            };

            var entry = archive.CreateEntry("agent_config.json");
            using (var es = entry.Open())
            using (var sw = new StreamWriter(es))
            {
                sw.Write(System.Text.Json.JsonSerializer.Serialize(config));
            }

            // Install-Service.ps1
            var script = @"param([string]$InstallPath = 'C:\AetherLux')
mkdir $InstallPath -Force
Copy-Item -Path .\LuxAgent.exe -Destination $InstallPath -Force
Copy-Item -Path .\agent_config.json -Destination $InstallPath -Force
sc.exe create ""AetherLux Agent"" binPath= ""$InstallPath\LuxAgent.exe"" DisplayName= ""AetherLux Agent"" start= auto
Start-Sleep -Seconds 1
Start-Service -Name 'AetherLux Agent' -ErrorAction SilentlyContinue
Write-Output 'Installation completed.'
";

            var scriptEntry = archive.CreateEntry("Install-Service.ps1");
            using (var es = scriptEntry.Open())
            using (var sw = new StreamWriter(es))
            {
                sw.Write(script);
            }

            // Add LuxAgent.exe if exists
            if (repoAgentPath != null && System.IO.File.Exists(repoAgentPath))
            {
                archive.CreateEntryFromFile(repoAgentPath, "LuxAgent.exe");
            }
            else
            {
                // placeholder readme
                var readmeEntry = archive.CreateEntry("README.txt");
                using (var es = readmeEntry.Open())
                using (var sw = new StreamWriter(es))
                {
                    sw.Write("LuxAgent.exe not found in repository. Replace with published binary.");
                }
            }
        }

        var downloadUrl = $"/installer/output/{filename}";

        return Ok(new { download = downloadUrl, token = token });
    }

    [HttpGet("download/{fileName}")]
    [Authorize]
    public IActionResult Download(string fileName)
    {
        var outputDir = Path.Combine(_env.ContentRootPath, "installer", "output");
        var filePath = Path.Combine(outputDir, fileName);
        if (!System.IO.File.Exists(filePath)) return NotFound();

        var stream = System.IO.File.OpenRead(filePath);
        return File(stream, "application/zip", fileName);
    }
}

public record GenerateInstallerRequest(long CompanyId, long TenantId);
