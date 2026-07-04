using AlgoFreight.Domain.Entities;

namespace AlgoFreight.Application.Interfaces;

public interface ITruckRepository
{
    Task<Truck?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Truck>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Truck> AddAsync(Truck truck, CancellationToken cancellationToken = default);
    Task UpdateAsync(Truck truck, CancellationToken cancellationToken = default);
    Task DeleteAsync(Truck truck, CancellationToken cancellationToken = default);
}
