# Contributing to AlgoFreight

Thanks for your interest in improving AlgoFreight. This project started as a solo portfolio build, but is structured to accept contributions cleanly.

## Branching Strategy

- `main` — always deployable, protected branch
- `develop` — integration branch for upcoming changes
- `feature/<short-description>` — new features (e.g. `feature/multi-truck-greedy`)
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — tooling, docs, CI changes

## Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

feat(api): add greedy multi-truck optimization endpoint
fix(frontend): correct truck capacity validation
docs(readme): update setup instructions
chore(ci): add build workflow
refactor(engine): extract cargo scoring into separate method
test(engine): add unit tests for knapsack edge cases
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Pull Request Process

1. Fork the repo and create your branch from `develop`
2. Make your changes with clear, atomic commits
3. Ensure `dotnet test` and `npm run lint` pass locally
4. Update documentation if you changed behavior
5. Open a PR against `develop` using the provided PR template
6. Link any related issue

## Code Style

- **Backend (C#)**: follow standard .NET naming conventions, run `dotnet format` before committing
- **Frontend (TypeScript)**: ESLint + Prettier configs are provided; run `npm run lint` and `npm run format`

### Architectural Rules

This project follows CQRS via MediatR. Contributions that don't follow this pattern will be asked to change before merge:

- **CQRS Enforcement**: Controllers must **not** inject `DbContext` or repositories directly. All business logic must live in MediatR `IRequestHandler<TRequest, TResponse>` classes in `AlgoFreight.Application`. Controllers only construct a `Command`/`Query`, dispatch it via `IMediator.Send()`, and map the result to an HTTP response.
- **Validation**: Manual `if` validation checks inside handlers are forbidden. Every `Command`/`Query` that accepts user input must have a paired `FluentValidation` validator; validation failures are caught automatically by the `ValidationBehavior` pipeline before the request reaches its handler. Handlers should assume the request is already valid.
- **Exceptions**: Don't write per-endpoint `try/catch` for expected error cases (validation, not-found, etc.) — throw the appropriate typed exception (`ValidationException`, `NotFoundException`) and let the global `IExceptionHandler` translate it into a consistent `ProblemDetails` response.

## Reporting Bugs / Requesting Features

Please use the issue templates under `.github/ISSUE_TEMPLATE/` — they ensure enough context is captured to act on the report quickly.
