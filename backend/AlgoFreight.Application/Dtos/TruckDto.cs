namespace AlgoFreight.Application.Dtos;

public record TruckDto(
    Guid Id,
    string PlateNumber,
    decimal MaxCapacityKg,
    string Route,
    bool IsAvailable
);
