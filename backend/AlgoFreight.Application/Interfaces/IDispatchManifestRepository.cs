using AlgoFreight.Domain.Entities;

namespace AlgoFreight.Application.Interfaces;

public interface IDispatchManifestRepository
{
    Task<DispatchManifest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DispatchManifest>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DispatchManifest> AddAsync(DispatchManifest manifest, CancellationToken cancellationToken = default);
    Task UpdateAsync(DispatchManifest manifest, CancellationToken cancellationToken = default);
    Task DeleteAsync(DispatchManifest manifest, CancellationToken cancellationToken = default);
}
