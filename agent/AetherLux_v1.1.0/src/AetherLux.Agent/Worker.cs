using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net;
using System.Net.Http.Json;

namespace AetherLux.Agent;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IConfiguration _configuration;
    private HubConnection? _hubConnection;

    public Worker(ILogger<Worker> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var webSocketUrl = _configuration["Agent:WebSocketUrl"] ?? "https://localhost:5001/agenthub";
        var apiBase = _configuration["Agent:ApiBase"] ?? _configuration["ConnectionStrings:ApiBase"] ?? "http://localhost:5000";
        var heartbeatInterval = int.TryParse(_configuration["Agent:HeartbeatIntervalSeconds"], out var interval) ? interval : 30;

        _hubConnection = new HubConnectionBuilder()
            .WithUrl(webSocketUrl)
            .WithAutomaticReconnect(new[] { TimeSpan.Zero, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30) })
            .Build();

        _hubConnection.Reconnecting += error =>
        {
            _logger.LogWarning(error, "Agent hub reconnecting...");
            return Task.CompletedTask;
        };

        _hubConnection.Reconnected += connectionId =>
        {
            _logger.LogInformation("Agent hub reconnected with connection id {ConnectionId}", connectionId);
            return Task.CompletedTask;
        };

        _hubConnection.Closed += error =>
        {
            _logger.LogWarning(error, "Agent hub connection closed");
            return Task.CompletedTask;
        };

        _hubConnection.On<string, JsonElement>("ExecuteCommand", async (command, payload) =>
        {
            _logger.LogInformation("Received command {Command} with payload {Payload}", command, payload);
            await Task.CompletedTask;
        });

        // Attempt registration via HTTP using installation token from config file
        await TryRegisterWithServerAsync(apiBase);

        await StartConnectionAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendHeartbeatAsync(stoppingToken);
                await Task.Delay(TimeSpan.FromSeconds(heartbeatInterval), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in agent worker loop.");
            }
        }
    }

    private async Task StartConnectionAsync(CancellationToken token)
    {
        while (_hubConnection?.State != HubConnectionState.Connected && !token.IsCancellationRequested)
        {
            try
            {
                await _hubConnection!.StartAsync(token);
                _logger.LogInformation("Connected to agent hub.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to connect to agent hub. Retrying...");
                await Task.Delay(TimeSpan.FromSeconds(5), token);
            }
        }
    }

    private async Task SendHeartbeatAsync(CancellationToken token)
    {
        if (_hubConnection?.State == HubConnectionState.Connected)
        {
            var status = new
            {
                MachineName = Environment.MachineName,
                Hostname = Dns.GetHostName(),
                Online = true,
                AgentVersion = "1.0.0",
                Timestamp = DateTime.UtcNow,
                UptimeSeconds = Environment.TickCount64 / 1000
            };

            await _hubConnection.SendAsync("SendAgentStatus", Environment.MachineName, status, token);
            _logger.LogInformation("Sent heartbeat to hub.");
        }
        else
        {
            _logger.LogInformation("Agent hub not connected. Attempting reconnect.");
            await StartConnectionAsync(token);
        }
    }

    private async Task TryRegisterWithServerAsync(string apiBase)
    {
        try
        {
            // try to read agent_config.json from current dir or C:\AetherLux
            string? configPath = null;
            var local = Path.Combine(AppContext.BaseDirectory, "agent_config.json");
            var fallback = Path.Combine("C:", "AetherLux", "agent_config.json");
            if (File.Exists(local)) configPath = local;
            else if (File.Exists(fallback)) configPath = fallback;

            if (configPath == null)
            {
                _logger.LogInformation("No agent_config.json found for automatic registration.");
                return;
            }

            var json = await File.ReadAllTextAsync(configPath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var installationToken = root.GetProperty("InstallationToken").GetString();

            if (string.IsNullOrWhiteSpace(installationToken))
            {
                _logger.LogWarning("Installation token missing in config.");
                return;
            }

            var registerUrl = apiBase.TrimEnd('/') + "/api/agent/register";
            using var client = new HttpClient();
            var payload = new
            {
                InstallationToken = installationToken,
                Hostname = Dns.GetHostName(),
                MachineName = Environment.MachineName,
                IpAddress = GetLocalIp() ?? "",
                MacAddress = "",
                OperatingSystem = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
                AgentVersion = "1.0.0"
            };

            var res = await client.PostAsJsonAsync(registerUrl, payload);
            if (res.IsSuccessStatusCode)
            {
                _logger.LogInformation("Agent registered with server successfully.");
            }
            else
            {
                _logger.LogWarning("Agent registration failed: {Status}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during agent registration attempt.");
        }
    }

    private string? GetLocalIp()
    {
        try
        {
            using var s = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.InterNetwork, System.Net.Sockets.SocketType.Dgram, 0);
            s.Connect("8.8.8.8", 65530);
            var endPoint = s.LocalEndPoint as System.Net.IPEndPoint;
            return endPoint?.Address.ToString();
        }
        catch
        {
            return null;
        }
    }
}
