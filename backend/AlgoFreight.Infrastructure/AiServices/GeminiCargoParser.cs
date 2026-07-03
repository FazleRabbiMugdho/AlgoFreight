using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using AlgoFreight.Application.Dtos;
using AlgoFreight.Application.Exceptions;
using AlgoFreight.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AlgoFreight.Infrastructure.AiServices;

/// <summary>
/// Parses free-text cargo descriptions into structured CargoDto records
/// by calling the Gemini LLM API. The raw LLM response is sanitized to
/// strip markdown code fences before JSON deserialization, because Gemini
/// (and most LLMs) routinely wrap JSON output in ```json ... ``` even when
/// instructed not to.
///
/// RETRY POLICY: up to 3 attempts with exponential backoff (1s, 2s, 4s)
/// for transient failures (HTTP 429 rate limits, timeouts). After retries
/// are exhausted, an AiServiceUnavailableException is thrown so the
/// controller can return a 503 response.
///
/// The Gemini API key is read from configuration (Gemini:ApiKey) and is
/// NEVER logged or included in exception messages.
/// </summary>
public sealed class GeminiCargoParser : IGeminiCargoParser
{
    private const int MaxRetries = 3;
    private static readonly TimeSpan[] BackoffDelays = [TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(4)];

    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<GeminiCargoParser> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GeminiCargoParser(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiCargoParser> logger)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"]
            ?? throw new InvalidOperationException("Gemini:ApiKey is not configured.");
        _logger = logger;
    }

    public async Task<CargoDto> ParseAsync(string freeText, CancellationToken cancellationToken = default)
    {
        var requestBody = BuildRequestPayload(freeText);

        for (var attempt = 1; attempt <= MaxRetries; attempt++)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}",
                    requestBody,
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    if ((int)response.StatusCode != 429 && (int)response.StatusCode < 500)
                    {
                        var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                        throw new AiServiceUnavailableException(
                            $"Gemini API returned {(int)response.StatusCode}: {errorBody.Substring(0, Math.Min(errorBody.Length, 200))}");
                    }

                    if (attempt < MaxRetries)
                    {
                        _logger.LogWarning(
                            "Gemini API call failed with status {StatusCode}, retrying (attempt {Attempt}/{MaxAttempts})",
                            (int)response.StatusCode, attempt, MaxRetries);
                        await Task.Delay(BackoffDelays[attempt - 1], cancellationToken);
                        continue;
                    }

                    throw new AiServiceUnavailableException(
                        $"Gemini API returned {(int)response.StatusCode} after {MaxRetries} retries.");
                }

                return ExtractCargoDto(await response.Content.ReadAsStringAsync(cancellationToken));
            }
            catch (CargoParsingException)
            {
                throw;
            }
            catch (AiServiceUnavailableException)
            {
                throw;
            }
            catch (Exception ex) when (attempt < MaxRetries)
            {
                _logger.LogWarning(
                    "Gemini API call failed, retrying (attempt {Attempt}/{MaxAttempts}): {Error}",
                    attempt, MaxRetries, ex.Message);
                await Task.Delay(BackoffDelays[attempt - 1], cancellationToken);
            }
            catch (Exception ex)
            {
                throw new AiServiceUnavailableException(
                    $"Gemini API is unavailable after {MaxRetries} retries.", ex);
            }
        }

        // Should never reach here.
        throw new AiServiceUnavailableException("Unexpected control flow in Gemini retry loop.");
    }

    /// <summary>
    /// Builds the Gemini API request payload with the system instruction
    /// to return ONLY raw JSON matching the CargoDto schema.
    /// </summary>
    private static object BuildRequestPayload(string freeText)
    {
        /* Gemini prompt:
           You are a cargo data extractor. Given a free-text cargo description,
           return ONLY a JSON object (no markdown, no code fences, no commentary)
           matching this schema exactly:
           {
             "description": string,
             "weightKg": number,
             "destination": string,
             "priority": "Low"|"Medium"|"High"|"Urgent",
             "isFragile": boolean
           }
           If a field cannot be inferred, use reasonable defaults:
           description -> the original text, weightKg -> 0,
           destination -> "Unknown", priority -> "Low", isFragile -> false.
        */
        return new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new
                        {
                            text = $"You are a cargo data extractor. Given a free-text cargo description, return ONLY a JSON object (no markdown, no code fences, no commentary) matching this schema exactly: {{\"description\": string, \"weightKg\": number, \"destination\": string, \"priority\": \"Low\"|\"Medium\"|\"High\"|\"Urgent\", \"isFragile\": boolean}}. If a field cannot be inferred, use reasonable defaults: description -> the original text, weightKg -> 0, destination -> \"Unknown\", priority -> \"Low\", isFragile -> false.\n\nText: {freeText}"
                        }
                    }
                }
            }
        };
    }

    /// <summary>
    /// Extracts the text from Gemini's response envelope, sanitizes it, and
    /// deserializes into a CargoDto.
    /// </summary>
    private CargoDto ExtractCargoDto(string rawResponse)
    {
        // 1. Parse the Gemini response envelope to get the generated text.
        GeminiResponse? envelope;
        try
        {
            envelope = JsonSerializer.Deserialize<GeminiResponse>(rawResponse, JsonOptions);
        }
        catch (JsonException ex)
        {
            throw new CargoParsingException(
                "Failed to parse Gemini API response envelope.",
                SanitizeJsonPayload(rawResponse), ex);
        }

        var generatedText = envelope?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
        if (string.IsNullOrWhiteSpace(generatedText))
        {
            throw new CargoParsingException(
                "Gemini response contained no generated text.",
                SanitizeJsonPayload(rawResponse));
        }

        // 2. Sanitize: strip markdown code fences and surrounding whitespace.
        var sanitized = SanitizeJsonPayload(generatedText);

        // 3. Deserialize into CargoDto.
        CargoDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<CargoDto>(sanitized, JsonOptions);
        }
        catch (JsonException ex)
        {
            throw new CargoParsingException(
                "Gemini response could not be deserialized into a CargoDto.",
                sanitized, ex);
        }

        if (dto is null)
        {
            throw new CargoParsingException(
                "Gemini response deserialized to null.",
                sanitized);
        }

        // 4. Validate required fields.
        if (string.IsNullOrWhiteSpace(dto.Description) ||
            string.IsNullOrWhiteSpace(dto.Destination) ||
            string.IsNullOrWhiteSpace(dto.Priority))
        {
            throw new CargoParsingException(
                "Gemini response is missing one or more required fields (description, destination, priority).",
                sanitized);
        }

        return dto;
    }

    /// <summary>
    /// Strips markdown code fences (```json ... ```, ``` ... ```) and
    /// surrounding whitespace from a raw LLM response. Handles fences
    /// with no language tag, trailing newlines, and leading/trailing
    /// commentary.
    ///
    /// WHY THIS IS NEEDED: LLMs frequently wrap JSON output in markdown
    /// code fences even when instructed not to. This is not a hypothetical
    /// edge case — it happens routinely in practice. The instruction to
    /// return "raw JSON only" is best-effort, not guaranteed.
    /// </summary>
    public static string SanitizeJsonPayload(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return string.Empty;

        var trimmed = raw.Trim();

        // Remove leading ```json or ``` (with optional language tag) and any
        // text before the first { or [ that isn't part of JSON.
        trimmed = Regex.Replace(trimmed, @"^```[a-zA-Z]*\s*\n?", string.Empty);

        // Remove trailing ``` and any trailing non-JSON text after it.
        var fenceIndex = trimmed.LastIndexOf("```", StringComparison.Ordinal);
        if (fenceIndex >= 0)
        {
            trimmed = trimmed.Substring(0, fenceIndex);
        }

        return trimmed.Trim();
    }

    // --- Gemini API response DTOs ---

#pragma warning disable CS8618
    private sealed class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate>? Candidates { get; set; }
    }

    private sealed class Candidate
    {
        [JsonPropertyName("content")]
        public Content? Content { get; set; }
    }

    private sealed class Content
    {
        [JsonPropertyName("parts")]
        public List<Part>? Parts { get; set; }
    }

    private sealed class Part
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
#pragma warning restore CS8618
}
