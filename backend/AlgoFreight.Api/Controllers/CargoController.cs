using AlgoFreight.Application.Interfaces;
using AlgoFreight.Application.Mapping;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace AlgoFreight.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CargoController : ControllerBase
{
    private readonly ICargoRepository _cargoRepo;

    public CargoController(ICargoRepository cargoRepo)
    {
        _cargoRepo = cargoRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var cargoes = await _cargoRepo.GetAllAsync(ct);
        return Ok(cargoes.Select(c => c.ToDto()));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var cargo = await _cargoRepo.GetByIdAsync(id, ct);
        if (cargo is null) return NotFound();
        return Ok(cargo.ToDto());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCargoRequest request, CancellationToken ct)
    {
        var cargo = new Cargo
        {
            Id = Guid.NewGuid(),
            Description = request.Description,
            WeightKg = request.WeightKg,
            Destination = request.Destination,
            Priority = Enum.Parse<Priority>(request.Priority, ignoreCase: true),
            IsFragile = request.IsFragile,
            Status = CargoStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _cargoRepo.AddAsync(cargo, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created.ToDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCargoRequest request, CancellationToken ct)
    {
        var cargo = await _cargoRepo.GetByIdAsync(id, ct);
        if (cargo is null) return NotFound();

        cargo.Description = request.Description;
        cargo.WeightKg = request.WeightKg;
        cargo.Destination = request.Destination;
        cargo.Priority = Enum.Parse<Priority>(request.Priority, ignoreCase: true);
        cargo.IsFragile = request.IsFragile;
        cargo.UpdatedAt = DateTime.UtcNow;

        await _cargoRepo.UpdateAsync(cargo, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var cargo = await _cargoRepo.GetByIdAsync(id, ct);
        if (cargo is null) return NotFound();

        await _cargoRepo.DeleteAsync(cargo, ct);
        return NoContent();
    }
}

public record CreateCargoRequest(
    string Description,
    decimal WeightKg,
    string Destination,
    string Priority,
    bool IsFragile
);

public record UpdateCargoRequest(
    string Description,
    decimal WeightKg,
    string Destination,
    string Priority,
    bool IsFragile
);
