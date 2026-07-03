using AlgoFreight.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlgoFreight.Infrastructure.Data.Configurations;

public class TruckConfiguration : IEntityTypeConfiguration<Truck>
{
    public void Configure(EntityTypeBuilder<Truck> builder)
    {
        builder.ToTable("Trucks");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.PlateNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(t => t.PlateNumber)
            .IsUnique();

        builder.Property(t => t.MaxCapacityKg)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(t => t.Route)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(t => t.IsAvailable)
            .IsRequired();

        builder.Property(t => t.CreatedAt)
            .IsRequired();

        builder.Property(t => t.UpdatedAt)
            .IsRequired();
    }
}
