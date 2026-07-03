using AlgoFreight.Application.Interfaces;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AlgoFreight.Infrastructure.Repositories;

public class CargoRepository : ICargoRepository
{
    private readonly AlgoFreightDbContext _context;

    public CargoRepository(AlgoFreightDbContext context)
    {
        _context = context;
    }

    public async Task<Cargo?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Cargoes.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Cargo>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Cargoes.ToListAsync(cancellationToken);
    }

    public async Task<Cargo> AddAsync(Cargo cargo, CancellationToken cancellationToken = default)
    {
        _context.Cargoes.Add(cargo);
        await _context.SaveChangesAsync(cancellationToken);
        return cargo;
    }

    public async Task UpdateAsync(Cargo cargo, CancellationToken cancellationToken = default)
    {
        _context.Cargoes.Update(cargo);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Cargo cargo, CancellationToken cancellationToken = default)
    {
        _context.Cargoes.Remove(cargo);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
