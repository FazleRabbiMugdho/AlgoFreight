using AlgoFreight.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlgoFreight.Infrastructure.Data.Configurations;

public class DispatchManifestConfiguration : IEntityTypeConfiguration<DispatchManifest>
{
    public void Configure(EntityTypeBuilder<DispatchManifest> builder)
    {
        builder.ToTable("DispatchManifests");

        builder.HasKey(dm => dm.Id);

        builder.Property(dm => dm.RunTimestamp)
            .IsRequired();

        builder.Property(dm => dm.TotalWeightKg)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(dm => dm.AlgorithmUsed)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(dm => dm.CreatedAt)
            .IsRequired();

        builder.Property(dm => dm.UpdatedAt)
            .IsRequired();

        builder.HasOne(dm => dm.Truck)
            .WithMany()
            .HasForeignKey(dm => dm.TruckId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
