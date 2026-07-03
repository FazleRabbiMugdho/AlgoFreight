namespace AlgoFreight.Domain.Entities;

public class Truck
{
    public Guid Id { get; set; }
    public string PlateNumber { get; set; } = string.Empty;
    public decimal MaxCapacityKg { get; set; }
    public string Route { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public ICollection<Cargo> Cargoes { get; set; } = new List<Cargo>();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
