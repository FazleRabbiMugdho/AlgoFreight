using AlgoFreight.Application.Interfaces;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AlgoFreight.Infrastructure.Repositories;

public class DispatchManifestRepository : IDispatchManifestRepository
{
    private readonly AlgoFreightDbContext _context;

    public DispatchManifestRepository(AlgoFreightDbContext context)
    {
        _context = context;
    }

    public async Task<DispatchManifest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.DispatchManifests
            .Include(dm => dm.ManifestCargoItems)
            .ThenInclude(mci => mci.Cargo)
            .FirstOrDefaultAsync(dm => dm.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<DispatchManifest>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.DispatchManifests
            .Include(dm => dm.ManifestCargoItems)
            .ThenInclude(mci => mci.Cargo)
            .ToListAsync(cancellationToken);
    }

    public async Task<DispatchManifest> AddAsync(DispatchManifest manifest, CancellationToken cancellationToken = default)
    {
        _context.DispatchManifests.Add(manifest);
        await _context.SaveChangesAsync(cancellationToken);
        return manifest;
    }

    public async Task UpdateAsync(DispatchManifest manifest, CancellationToken cancellationToken = default)
    {
        _context.DispatchManifests.Update(manifest);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(DispatchManifest manifest, CancellationToken cancellationToken = default)
    {
        _context.DispatchManifests.Remove(manifest);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
