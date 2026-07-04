using AlgoFreight.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlgoFreight.Infrastructure.Data;

public class AlgoFreightDbContext : DbContext
{
    public AlgoFreightDbContext(DbContextOptions<AlgoFreightDbContext> options) : base(options) { }

    public DbSet<Cargo> Cargoes => Set<Cargo>();
    public DbSet<Truck> Trucks => Set<Truck>();
    public DbSet<DispatchManifest> DispatchManifests => Set<DispatchManifest>();
    public DbSet<ManifestCargoItem> ManifestCargoItems => Set<ManifestCargoItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AlgoFreightDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
