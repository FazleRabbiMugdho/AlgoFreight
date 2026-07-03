using System.Data;

namespace AlgoFreight.Application.Interfaces;

/// <summary>
/// Narrow abstraction over EF Core's transaction API so the Application layer
/// never depends directly on Microsoft.EntityFrameworkCore. Infrastructure
/// provides the concrete implementation backed by AlgoFreightDbContext.
///
/// WHY an abstraction instead of referencing EF Core's IDbContextTransaction:
/// Clean architecture rules forbid the Application layer from taking a
/// dependency on any external infrastructure library. By routing all
/// transaction calls through this interface, DispatchRunService (in
/// Application) can coordinate atomic commits while remaining unit-testable
/// with a simple mock instead of a real database transaction.
/// </summary>
public interface IUnitOfWork
{
    Task BeginTransactionAsync(IsolationLevel isolationLevel = IsolationLevel.ReadCommitted, CancellationToken cancellationToken = default);
    Task CommitAsync(CancellationToken cancellationToken = default);
    Task RollbackAsync(CancellationToken cancellationToken = default);
}
