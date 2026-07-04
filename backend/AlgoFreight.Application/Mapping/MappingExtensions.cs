using AlgoFreight.Application.Dtos;
using AlgoFreight.Domain.Entities;

namespace AlgoFreight.Application.Mapping;

public static class MappingExtensions
{
    public static CargoDto ToDto(this Cargo cargo) => new(
        cargo.Id,
        cargo.Description,
        cargo.WeightKg,
        cargo.Destination,
        cargo.Priority.ToString(),
        cargo.IsFragile,
        cargo.Status.ToString(),
        cargo.TruckId
    );

    public static TruckDto ToDto(this Truck truck) => new(
        truck.Id,
        truck.PlateNumber,
        truck.MaxCapacityKg,
        truck.Route,
        truck.IsAvailable
    );
}
