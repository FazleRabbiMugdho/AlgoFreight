using AlgoFreight.Domain.Enums;

namespace AlgoFreight.Domain.Entities;

public class Cargo
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal WeightKg { get; set; }
    public string Destination { get; set; } = string.Empty;
    public Priority Priority { get; set; }
    public bool IsFragile { get; set; }
    public CargoStatus Status { get; set; }
    public Guid? TruckId { get; set; }
    public Truck? Truck { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
