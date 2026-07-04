using AlgoFreight.Application.Interfaces;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AlgoFreight.Infrastructure.Repositories;

public class TruckRepository : ITruckRepository
{
    private readonly AlgoFreightDbContext _context;

    public TruckRepository(AlgoFreightDbContext context)
    {
        _context = context;
    }

    public async Task<Truck?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Trucks.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Truck>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Trucks.ToListAsync(cancellationToken);
    }

    public async Task<Truck> AddAsync(Truck truck, CancellationToken cancellationToken = default)
    {
        _context.Trucks.Add(truck);
        await _context.SaveChangesAsync(cancellationToken);
        return truck;
    }

    public async Task UpdateAsync(Truck truck, CancellationToken cancellationToken = default)
    {
        _context.Trucks.Update(truck);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Truck truck, CancellationToken cancellationToken = default)
    {
        _context.Trucks.Remove(truck);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
