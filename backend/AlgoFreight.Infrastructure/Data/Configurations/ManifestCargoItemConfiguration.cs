using AlgoFreight.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlgoFreight.Infrastructure.Data.Configurations;

public class ManifestCargoItemConfiguration : IEntityTypeConfiguration<ManifestCargoItem>
{
    public void Configure(EntityTypeBuilder<ManifestCargoItem> builder)
    {
        builder.ToTable("ManifestCargoItems");

        builder.HasKey(mci => mci.Id);

        builder.Property(mci => mci.CreatedAt)
            .IsRequired();

        builder.Property(mci => mci.UpdatedAt)
            .IsRequired();

        builder.HasOne(mci => mci.DispatchManifest)
            .WithMany(dm => dm.ManifestCargoItems)
            .HasForeignKey(mci => mci.DispatchManifestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(mci => mci.Cargo)
            .WithMany()
            .HasForeignKey(mci => mci.CargoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(mci => new { mci.DispatchManifestId, mci.CargoId })
            .IsUnique();
    }
}
