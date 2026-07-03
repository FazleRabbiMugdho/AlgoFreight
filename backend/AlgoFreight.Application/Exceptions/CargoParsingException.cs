namespace AlgoFreight.Application.Exceptions;

/// <summary>
/// Thrown when the Gemini API response cannot be deserialized into a valid
/// CargoDto, even after sanitizing markdown fences from the raw payload.
/// Includes the sanitized payload text for debugging (but never the API key).
/// </summary>
public sealed class CargoParsingException : Exception
{
    /// <summary>
    /// The sanitized (markdown-fence-stripped) response payload that could
    /// not be parsed. May be empty if the response was entirely unparseable.
    /// </summary>
    public string SanitizedPayload { get; }

    public CargoParsingException(string message, string sanitizedPayload, Exception? inner = null)
        : base(message, inner)
    {
        SanitizedPayload = sanitizedPayload;
    }
}
