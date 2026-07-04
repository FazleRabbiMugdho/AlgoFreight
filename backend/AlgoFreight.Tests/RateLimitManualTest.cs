/// <summary>
/// MANUAL TEST — Rate Limiting on POST /api/cargo/parse and POST /api/dispatch/run
///
/// Since a full integration test harness (WebApplicationFactory) would introduce
/// significant overhead for this phase, the rate limiting verification is documented
/// here as a manual test procedure.
///
/// CONFIGURED LIMITS (Fixed Window, 1-minute window, no queuing):
///   ai-intake:    10 requests/minute per client  (POST /api/cargo/parse)
///   dispatch-run: 20 requests/minute per client  (POST /api/dispatch/run)
///
/// WHY FIXED WINDOW: Simpler than Token Bucket to reason about and configure.
/// For a free-tier demo app with low expected traffic, the burst-at-window-boundary
/// behavior is acceptable. Token Bucket would be preferred if the API needed to
/// enforce a sustained rate with burst smoothing in production.
///
/// MANUAL TEST STEPS for /api/cargo/parse (ai-intake):
///   1. Start the backend: dotnet run --project AlgoFreight.Api
///   2. Send 12 rapid requests to POST /api/cargo/parse with body:
///      { "text": "test cargo" }
///      Using PowerShell:
///        for ($i=0; $i -lt 12; $i++) {
///          $r = Invoke-WebRequest -Uri "http://localhost:5228/api/cargo/parse"
///            -Method Post -ContentType "application/json"
///            -Body '{"text":"test cargo"}'
///          Write-Host "$($i+1): $($r.StatusCode)"
///        }
///   3. The first 10 requests should return 200 (or 422 if no API key configured).
///      Requests 11-12 should return HTTP 429 Too Many Requests with a Retry-After header.
///
/// MANUAL TEST STEPS for /api/dispatch/run (dispatch-run):
///   Follow the same pattern with POST /api/dispatch/run and body:
///   { "algorithm": "GreedyFirstFitDecreasing" }
///   The first 20 should succeed (200 or 400), and 21+ should return 429.
///
/// MANUAL TEST: TRIGGERING WINDOW RESET
///   Wait 60 seconds after receiving a 429. The next request should succeed
///   again, confirming the window resets correctly.
/// </summary>
internal static class RateLimitManualTest
{
}
