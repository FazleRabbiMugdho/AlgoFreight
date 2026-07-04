using System.Net;
using System.Text.Json;
using AlgoFreight.Application.Dtos;
using AlgoFreight.Application.Exceptions;
using AlgoFreight.Infrastructure.AiServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;

namespace AlgoFreight.Tests;

public class GeminiCargoParserTests
{
    private const string ApiKey = "test-api-key";

    private static Mock<HttpMessageHandler> CreateHandlerMock(HttpStatusCode statusCode, string responseContent)
    {
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = statusCode,
                Content = new StringContent(responseContent)
            });
        return handler;
    }

    private static GeminiCargoParser CreateParser(Mock<HttpMessageHandler> handlerMock)
    {
        var client = new HttpClient(handlerMock.Object);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gemini:ApiKey"] = ApiKey
            })
            .Build();
        var logger = new Mock<ILogger<GeminiCargoParser>>();
        return new GeminiCargoParser(client, config, logger.Object);
    }

    private static string BuildGeminiResponse(string generatedText)
    {
        var envelope = new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new[]
                        {
                            new { text = generatedText }
                        }
                    }
                }
            }
        };
        return JsonSerializer.Serialize(envelope);
    }

    private const string WellFormedJson =
        """{"description":"Electronics","weightKg":200,"destination":"Chittagong","priority":"Urgent","isFragile":true}""";

    // ---- Test A: Well-formed JSON response parses correctly ----

    [Fact]
    public async Task Parse_WellFormedJson_ReturnsCorrectCargoDto()
    {
        var handler = CreateHandlerMock(HttpStatusCode.OK, BuildGeminiResponse(WellFormedJson));
        var parser = CreateParser(handler);

        var result = await parser.ParseAsync("200kg electronics to Chittagong, urgent, fragile");

        Assert.Equal("Electronics", result.Description);
        Assert.Equal(200m, result.WeightKg);
        Assert.Equal("Chittagong", result.Destination);
        Assert.Equal("Urgent", result.Priority);
        Assert.True(result.IsFragile);
    }

    // ---- Test B: Markdown code fences are sanitized ----
    // This is the most important test case in this phase — LLMs routinely
    // wrap JSON in ```json ... ``` even when instructed not to.

    [Fact]
    public async Task Parse_MarkdownCodeFences_SanitizesAndParsesSuccessfully()
    {
        var fencedJson = $"```json\n{WellFormedJson}\n```";
        var handler = CreateHandlerMock(HttpStatusCode.OK, BuildGeminiResponse(fencedJson));
        var parser = CreateParser(handler);

        var result = await parser.ParseAsync("200kg electronics to Chittagong, urgent, fragile");

        Assert.Equal("Electronics", result.Description);
        Assert.Equal(200m, result.WeightKg);
        Assert.Equal("Chittagong", result.Destination);
    }

    [Fact]
    public async Task Parse_CodeFencesWithoutLanguageTag_SanitizesAndParses()
    {
        var fencedJson = $"```\n{WellFormedJson}\n```";
        var handler = CreateHandlerMock(HttpStatusCode.OK, BuildGeminiResponse(fencedJson));
        var parser = CreateParser(handler);

        var result = await parser.ParseAsync("test");

        Assert.Equal("Electronics", result.Description);
    }

    [Fact]
    public async Task Parse_CodeFencesWithTrailingNewline_SanitizesAndParses()
    {
        var fencedJson = $"```json\n{WellFormedJson}\n```\n";
        var handler = CreateHandlerMock(HttpStatusCode.OK, BuildGeminiResponse(fencedJson));
        var parser = CreateParser(handler);

        var result = await parser.ParseAsync("test");

        Assert.Equal("Electronics", result.Description);
    }

    // ---- Test C: Malformed/non-JSON response throws CargoParsingException ----

    [Fact]
    public async Task Parse_NonJsonResponse_ThrowsCargoParsingException()
    {
        var handler = CreateHandlerMock(HttpStatusCode.OK, BuildGeminiResponse("This is not JSON at all"));
        var parser = CreateParser(handler);

        var ex = await Assert.ThrowsAsync<CargoParsingException>(() =>
            parser.ParseAsync("test"));

        Assert.Contains("could not be deserialized", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    // ---- Test D: Missing required fields throws CargoParsingException ----

    [Fact]
    public async Task Parse_MissingRequiredField_ThrowsCargoParsingException()
    {
        var incompleteJson = """{"description":"","weightKg":0,"destination":"","priority":"","isFragile":false}""";
        var handler = CreateHandlerMock(HttpStatusCode.OK, BuildGeminiResponse(incompleteJson));
        var parser = CreateParser(handler);

        var ex = await Assert.ThrowsAsync<CargoParsingException>(() =>
            parser.ParseAsync("test"));

        Assert.Contains("required", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    // ---- Test E: 429 rate limit triggers retry, exhaustion throws AiServiceUnavailableException ----

    [Fact]
    public async Task Parse_RetryOn429_ExhaustionThrowsAiServiceUnavailable()
    {
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        var callCount = 0;
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.TooManyRequests,
                    Content = new StringContent("Rate limited")
                };
            });

        var parser = CreateParser(handler);

        var ex = await Assert.ThrowsAsync<AiServiceUnavailableException>(() =>
            parser.ParseAsync("test"));

        // Should have tried 3 times (MaxRetries)
        Assert.Equal(3, callCount);
    }

    [Fact]
    public async Task Parse_Timeout_TriggersRetry()
    {
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        var callCount = 0;
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;
                throw new TaskCanceledException("Timeout");
            });

        var parser = CreateParser(handler);

        await Assert.ThrowsAsync<AiServiceUnavailableException>(() =>
            parser.ParseAsync("test"));

        // Should have tried 3 times
        Assert.Equal(3, callCount);
    }

    // ---- SanitizeJsonPayload unit tests ----

    [Fact]
    public void SanitizeJsonPayload_RawJson_Unchanged()
    {
        var result = GeminiCargoParser.SanitizeJsonPayload(WellFormedJson);
        Assert.Equal(WellFormedJson, result);
    }

    [Fact]
    public void SanitizeJsonPayload_LeadingTrailingWhitespace_Trimmed()
    {
        var result = GeminiCargoParser.SanitizeJsonPayload($"  \n{WellFormedJson}\n  ");
        Assert.Equal(WellFormedJson, result);
    }

    [Fact]
    public void SanitizeJsonPayload_FencedWithJsonTag_Stripped()
    {
        var input = $"```json\n{WellFormedJson}\n```";
        var result = GeminiCargoParser.SanitizeJsonPayload(input);
        Assert.Equal(WellFormedJson, result);
    }

    [Fact]
    public void SanitizeJsonPayload_FencedNoTag_Stripped()
    {
        var input = $"```\n{WellFormedJson}\n```";
        var result = GeminiCargoParser.SanitizeJsonPayload(input);
        Assert.Equal(WellFormedJson, result);
    }

    [Fact]
    public void SanitizeJsonPayload_EmptyString_ReturnsEmpty()
    {
        var result = GeminiCargoParser.SanitizeJsonPayload("");
        Assert.Equal("", result);
    }

    [Fact]
    public void SanitizeJsonPayload_NullishWhitespace_ReturnsEmpty()
    {
        var result = GeminiCargoParser.SanitizeJsonPayload("   \n  \t  ");
        Assert.Equal("", result);
    }
}
