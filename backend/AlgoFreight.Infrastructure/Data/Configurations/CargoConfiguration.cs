using AlgoFreight.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlgoFreight.Infrastructure.Data.Configurations;

public class CargoConfiguration : IEntityTypeConfiguration<Cargo>
{
    public void Configure(EntityTypeBuilder<Cargo> builder)
    {
        builder.ToTable("Cargoes");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Description)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(c => c.WeightKg)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(c => c.Destination)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.Priority)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(c => c.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(c => c.IsFragile)
            .IsRequired();

        builder.Property(c => c.CreatedAt)
            .IsRequired();

        builder.Property(c => c.UpdatedAt)
            .IsRequired();

        builder.HasOne(c => c.Truck)
            .WithMany(t => t.Cargoes)
            .HasForeignKey(c => c.TruckId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
