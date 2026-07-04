using Microsoft.AspNetCore.SignalR;

namespace AlgoFreight.Api.Hubs;

/// <summary>
/// SignalR hub for broadcasting dispatch events to connected clients.
/// This hub defines no server-invoked methods — it exists purely to push
/// "DispatchCompleted" and similar events from the server via IHubContext.
/// </summary>
public sealed class DispatchHub : Hub
{
}
