using AlgoFreight.Application.Interfaces;
using AlgoFreight.Application.Services;
using AlgoFreight.Api.Hubs;
using AlgoFreight.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace AlgoFreight.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DispatchController : ControllerBase
{
    private readonly DispatchRunService _dispatchRunService;
    private readonly IDispatchManifestRepository _manifestRepo;
    private readonly IHubContext<DispatchHub> _hubContext;

    public DispatchController(
        DispatchRunService dispatchRunService,
        IDispatchManifestRepository manifestRepo,
        IHubContext<DispatchHub> hubContext)
    {
        _dispatchRunService = dispatchRunService;
        _manifestRepo = manifestRepo;
        _hubContext = hubContext;
    }

    /// <summary>
    /// Runs the optimization engine, persists the results, and broadcasts
    /// a "DispatchCompleted" event via SignalR.
    /// </summary>
    [HttpPost("run")]
    [EnableRateLimiting("dispatch-run")]
    public async Task<IActionResult> Run([FromBody] DispatchRunRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<AlgorithmType>(request.Algorithm, ignoreCase: true, out var algorithm))
        {
            return BadRequest(new { error = $"Invalid algorithm '{request.Algorithm}'. Valid values: GreedyFirstFitDecreasing, ExactKnapsack." });
        }

        if (algorithm == AlgorithmType.ExactKnapsack && !request.TruckId.HasValue)
        {
            return BadRequest(new { error = "ExactKnapsack requires a truckId." });
        }

        try
        {
            var result = await _dispatchRunService.ExecuteAsync(algorithm, request.TruckId, ct);

            // Broadcast via SignalR — keep this in the API layer so
            // DispatchRunService remains unit-testable without a real hub.
            await _hubContext.Clients.All.SendAsync("DispatchCompleted", new
            {
                manifestIds = result.Manifests.Select(m => m.Id.ToString()),
                truckIds = result.Manifests.Select(m => m.TruckId.ToString()).Distinct(),
                cargoCount = result.Manifests.Sum(m => m.ManifestCargoItems.Count),
                totalPriorityScore = result.TotalPriorityScoreAchieved,
                algorithmUsed = result.AlgorithmUsed.ToString(),
                timestamp = DateTime.UtcNow
            }, ct);

            return Ok(new
            {
                manifests = result.Manifests.Select(m => new
                {
                    id = m.Id,
                    truckId = m.TruckId,
                    totalWeightKg = m.TotalWeightKg,
                    cargoIds = m.ManifestCargoItems.Select(mci => mci.CargoId).ToList(),
                    algorithmUsed = m.AlgorithmUsed.ToString(),
                    runTimestamp = m.RunTimestamp
                }).ToList(),
                unassignedCargoIds = result.UnassignedCargoIds,
                totalPriorityScoreAchieved = result.TotalPriorityScoreAchieved,
                algorithmUsed = result.AlgorithmUsed.ToString(),
                executionTimeMs = result.ExecutionTimeMs
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Returns a paginated list of past DispatchManifest records.
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var allManifests = await _manifestRepo.GetAllAsync(ct);

        var totalCount = allManifests.Count;
        var paginated = allManifests
            .OrderByDescending(m => m.RunTimestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new
        {
            items = paginated.Select(m => new
            {
                id = m.Id,
                truckId = m.TruckId,
                totalWeightKg = m.TotalWeightKg,
                algorithmUsed = m.AlgorithmUsed.ToString(),
                cargoCount = m.ManifestCargoItems.Count,
                runTimestamp = m.RunTimestamp
            }),
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        });
    }
}

public record DispatchRunRequest(string Algorithm, Guid? TruckId);
