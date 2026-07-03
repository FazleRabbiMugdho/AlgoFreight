using AlgoFreight.Application.Dtos;
using AlgoFreight.Application.Exceptions;
using AlgoFreight.Application.Interfaces;
using AlgoFreight.Application.Mapping;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AlgoFreight.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CargoController : ControllerBase
{
    private readonly ICargoRepository _cargoRepo;
    private readonly IGeminiCargoParser _geminiParser;

    public CargoController(ICargoRepository cargoRepo, IGeminiCargoParser? geminiParser = null)
    {
        _cargoRepo = cargoRepo;
        _geminiParser = geminiParser!;
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

    /// <summary>
    /// Parses a free-text cargo description using the Gemini AI API and
    /// returns a preview CargoDto WITHOUT saving it to the database.
    ///
    /// WHY PARSE-THEN-CONFIRM instead of auto-save:
    /// LLM output is inherently non-deterministic and can hallucinate
    /// incorrect values (wrong weight, fabricated destinations, etc.).
    /// Auto-saving unverified AI output directly to the database would
    /// introduce data integrity risks. Instead, the frontend shows the
    /// parsed result to the user for confirmation before the existing
    /// POST /api/cargo endpoint actually persists it. This two-step flow
    /// keeps a human in the loop for all database writes derived from AI.
    /// </summary>
    [HttpPost("parse")]
    [EnableRateLimiting("ai-intake")]
    public async Task<IActionResult> Parse([FromBody] ParseCargoRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required." });

        try
        {
            var dto = await _geminiParser.ParseAsync(request.Text, ct);
            return Ok(dto);
        }
        catch (CargoParsingException ex)
        {
            return UnprocessableEntity(new
            {
                error = "Could not parse cargo description. Please check the format and try again.",
                detail = ex.Message
            });
        }
        catch (AiServiceUnavailableException)
        {
            return StatusCode(503, new
            {
                error = "AI parsing is temporarily unavailable, please use the manual entry form."
            });
        }
    }
}

public record ParseCargoRequest(string Text);

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
