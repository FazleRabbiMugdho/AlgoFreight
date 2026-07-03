using AlgoFreight.Application.Dtos;

namespace AlgoFreight.Application.Interfaces;

/// <summary>
/// Parses free-text cargo descriptions into structured CargoDto records
/// using the Gemini LLM API. The returned DTO is a preview only — callers
/// should NOT auto-save unverified AI output to the database (see the
/// parse-then-confirm flow in CargoController).
/// </summary>
public interface IGeminiCargoParser
{
    /// <summary>
    /// Sends a free-text description to the Gemini API and returns a
    /// structured CargoDto.
    /// </summary>
    /// <param name="freeText">Natural-language cargo description, e.g. "200kg electronics to Chittagong, urgent, fragile".</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A validated CargoDto parsed from the LLM response.</returns>
    /// <exception cref="CargoParsingException">Thrown when the LLM response cannot be parsed into a valid CargoDto.</exception>
    /// <exception cref="AiServiceUnavailableException">Thrown when the Gemini API is unreachable or returns errors after exhausting retries.</exception>
    Task<CargoDto> ParseAsync(string freeText, CancellationToken cancellationToken = default);
}
