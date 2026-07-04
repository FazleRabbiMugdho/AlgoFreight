using System.Data;
using AlgoFreight.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AlgoFreight.Infrastructure.Data;

/// <summary>
/// Concrete implementation of IUnitOfWork backed by EF Core's
/// IDbContextTransaction API on AlgoFreightDbContext.
/// </summary>
public sealed class UnitOfWork : IUnitOfWork
{
    private readonly AlgoFreightDbContext _context;
    private IDbContextTransaction? _transaction;

    public UnitOfWork(AlgoFreightDbContext context)
    {
        _context = context;
    }

    public async Task BeginTransactionAsync(
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default)
    {
        _transaction = await _context.Database
            .BeginTransactionAsync(isolationLevel, cancellationToken);
    }

    public async Task CommitAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction is not null)
            await _transaction.CommitAsync(cancellationToken);
    }

    public async Task RollbackAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction is not null)
            await _transaction.RollbackAsync(cancellationToken);
    }
}
