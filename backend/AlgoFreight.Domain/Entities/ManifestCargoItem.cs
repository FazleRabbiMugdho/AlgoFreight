namespace AlgoFreight.Domain.Entities;

public class ManifestCargoItem
{
    public Guid Id { get; set; }
    public Guid DispatchManifestId { get; set; }
    public DispatchManifest DispatchManifest { get; set; } = null!;
    public Guid CargoId { get; set; }
    public Cargo Cargo { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
