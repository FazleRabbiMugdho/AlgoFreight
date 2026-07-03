namespace AlgoFreight.Application.Exceptions;

/// <summary>
/// Thrown when the Gemini API is unreachable or returns a non-success
/// status code after exhausting the configured retry policy. This is
/// distinct from a parse failure (CargoParsingException) so controllers
/// can return a 503 Service Unavailable response instead of a generic 500.
/// </summary>
public sealed class AiServiceUnavailableException : Exception
{
    public AiServiceUnavailableException(string message, Exception? inner = null)
        : base(message, inner)
    {
    }
}
