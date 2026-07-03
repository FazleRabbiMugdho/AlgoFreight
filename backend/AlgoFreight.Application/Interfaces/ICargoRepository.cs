using AlgoFreight.Domain.Entities;

namespace AlgoFreight.Application.Interfaces;

public interface ICargoRepository
{
    Task<Cargo?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Cargo>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Cargo> AddAsync(Cargo cargo, CancellationToken cancellationToken = default);
    Task UpdateAsync(Cargo cargo, CancellationToken cancellationToken = default);
    Task DeleteAsync(Cargo cargo, CancellationToken cancellationToken = default);
}
