# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Planned
- Multi-destination route optimization
- Configurable optimization weights (priority vs. distance vs. fragility)
- Role-based auth (Dispatcher / Fleet Manager / Admin)

## [0.1.0] - 2026-07-03
### Added
- Clean Architecture backend scaffold (Domain / Application / Infrastructure / Api / Tests) with Cargo, Truck, and DispatchManifest entities
- CQRS architecture using MediatR, with a FluentValidation pipeline behavior for centralized input validation and a global `IExceptionHandler` producing consistent `ProblemDetails` error responses
- Greedy First-Fit Decreasing and exact 0/1 Knapsack optimization algorithms, selectable per dispatch run
- Real-time dispatch telemetry via SignalR WebSockets, broadcasting `DispatchCompleted` events to the frontend with no HTTP polling
- AI-assisted cargo intake using the Gemini API, with markdown-fence-sanitized JSON parsing and a parse-then-confirm flow before any record is committed
- Transactional integrity for multi-step dispatch persistence, with rollback on partial failure
- Rate limiting on the AI intake and dispatch endpoints, plus structured logging with message templates
- React + TypeScript + Tailwind frontend with a split-pane operational dashboard, live manifest stream, capacity gauges, dark mode, and an analytics view for algorithm/utilization trends
- Docker Compose setup for local full-stack development
