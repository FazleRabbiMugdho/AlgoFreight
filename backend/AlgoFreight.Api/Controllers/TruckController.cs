using AlgoFreight.Application.Interfaces;
using AlgoFreight.Application.Mapping;
using AlgoFreight.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace AlgoFreight.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TruckController : ControllerBase
{
    private readonly ITruckRepository _truckRepo;

    public TruckController(ITruckRepository truckRepo)
    {
        _truckRepo = truckRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var trucks = await _truckRepo.GetAllAsync(ct);
        return Ok(trucks.Select(t => t.ToDto()));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var truck = await _truckRepo.GetByIdAsync(id, ct);
        if (truck is null) return NotFound();
        return Ok(truck.ToDto());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTruckRequest request, CancellationToken ct)
    {
        var truck = new Truck
        {
            Id = Guid.NewGuid(),
            PlateNumber = request.PlateNumber,
            MaxCapacityKg = request.MaxCapacityKg,
            Route = request.Route,
            IsAvailable = request.IsAvailable,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _truckRepo.AddAsync(truck, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTruckRequest request, CancellationToken ct)
    {
        var truck = await _truckRepo.GetByIdAsync(id, ct);
        if (truck is null) return NotFound();

        truck.PlateNumber = request.PlateNumber;
        truck.MaxCapacityKg = request.MaxCapacityKg;
        truck.Route = request.Route;
        truck.IsAvailable = request.IsAvailable;
        truck.UpdatedAt = DateTime.UtcNow;

        await _truckRepo.UpdateAsync(truck, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var truck = await _truckRepo.GetByIdAsync(id, ct);
        if (truck is null) return NotFound();

        await _truckRepo.DeleteAsync(truck, ct);
        return NoContent();
    }
}

public record CreateTruckRequest(
    string PlateNumber,
    decimal MaxCapacityKg,
    string Route,
    bool IsAvailable
);

public record UpdateTruckRequest(
    string PlateNumber,
    decimal MaxCapacityKg,
    string Route,
    bool IsAvailable
);
