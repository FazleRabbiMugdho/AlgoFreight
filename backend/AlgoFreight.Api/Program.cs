using System.Threading.RateLimiting;
using AlgoFreight.Api.Hubs;
using AlgoFreight.Application.Interfaces;
using AlgoFreight.Application.Services;
using AlgoFreight.Infrastructure.AiServices;
using AlgoFreight.Infrastructure.Data;
using AlgoFreight.Infrastructure.Repositories;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---- Persistence ----
builder.Services.AddDbContext<AlgoFreightDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// ---- Repositories ----
builder.Services.AddScoped<ICargoRepository, CargoRepository>();
builder.Services.AddScoped<ITruckRepository, TruckRepository>();
builder.Services.AddScoped<IDispatchManifestRepository, DispatchManifestRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// ---- Application Services ----
builder.Services.AddScoped<IDispatchOptimizationService, DispatchOptimizationService>();
builder.Services.AddScoped<DispatchRunService>();

// ---- AI Services ----
builder.Services.AddHttpClient<IGeminiCargoParser, GeminiCargoParser>();

// ---- SignalR ----
builder.Services.AddSignalR();

// ---- Rate Limiting ----
// Using Fixed Window instead of Token Bucket because the expected load is
// low (demo app), Fixed Window is simpler to reason about, and the burst
// behavior is acceptable for a free-tier demo. Limits:
//   ai-intake: 10 req/min — Gemini API calls have a per-request cost and
//              free-tier quota is limited. 10/min prevents accidental quota
//              burn while still usable for demo.
//   dispatch-run: 20 req/min — optimization is CPU-bound and expensive at
//                 scale but unlikely to be hammered in a demo. 20/min gives
//                 generous room for testing.
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("ai-intake", cfg =>
    {
        cfg.PermitLimit = 10;
        cfg.Window = TimeSpan.FromMinutes(1);
        cfg.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("dispatch-run", cfg =>
    {
        cfg.PermitLimit = 20;
        cfg.Window = TimeSpan.FromMinutes(1);
        cfg.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ---- MVC & Swagger ----
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---- CORS ----
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// ---- Middleware pipeline ----
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.MapControllers();
app.MapHub<DispatchHub>("/hubs/dispatch");

app.Run();
