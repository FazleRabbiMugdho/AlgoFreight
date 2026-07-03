using AlgoFreight.Domain.Enums;

namespace AlgoFreight.Domain.Entities;

public class DispatchManifest
{
    public Guid Id { get; set; }
    public Guid TruckId { get; set; }
    public Truck Truck { get; set; } = null!;
    public DateTime RunTimestamp { get; set; }
    public decimal TotalWeightKg { get; set; }
    public AlgorithmType AlgorithmUsed { get; set; }
    public ICollection<ManifestCargoItem> ManifestCargoItems { get; set; } = new List<ManifestCargoItem>();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
