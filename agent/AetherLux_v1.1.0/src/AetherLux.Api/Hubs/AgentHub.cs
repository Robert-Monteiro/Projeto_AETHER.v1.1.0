using Microsoft.AspNetCore.SignalR;

namespace AetherLux.Api.Hubs;

public class AgentHub : Hub
{
    public async Task SendAgentStatus(string agentId, object status)
    {
        await Clients.All.SendAsync("AgentStatusUpdated", agentId, status);
    }

    public async Task SendCommand(string agentId, string command, object payload)
    {
        await Clients.User(agentId).SendAsync("ExecuteCommand", command, payload);
    }
}
