using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlgoFreight.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Trucks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlateNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MaxCapacityKg = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Route = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trucks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cargoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    WeightKg = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Destination = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsFragile = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TruckId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cargoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cargoes_Trucks_TruckId",
                        column: x => x.TruckId,
                        principalTable: "Trucks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "DispatchManifests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TruckId = table.Column<Guid>(type: "uuid", nullable: false),
                    RunTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalWeightKg = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    AlgorithmUsed = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DispatchManifests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DispatchManifests_Trucks_TruckId",
                        column: x => x.TruckId,
                        principalTable: "Trucks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ManifestCargoItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DispatchManifestId = table.Column<Guid>(type: "uuid", nullable: false),
                    CargoId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManifestCargoItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManifestCargoItems_Cargoes_CargoId",
                        column: x => x.CargoId,
                        principalTable: "Cargoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ManifestCargoItems_DispatchManifests_DispatchManifestId",
                        column: x => x.DispatchManifestId,
                        principalTable: "DispatchManifests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cargoes_TruckId",
                table: "Cargoes",
                column: "TruckId");

            migrationBuilder.CreateIndex(
                name: "IX_DispatchManifests_TruckId",
                table: "DispatchManifests",
                column: "TruckId");

            migrationBuilder.CreateIndex(
                name: "IX_ManifestCargoItems_CargoId",
                table: "ManifestCargoItems",
                column: "CargoId");

            migrationBuilder.CreateIndex(
                name: "IX_ManifestCargoItems_DispatchManifestId_CargoId",
                table: "ManifestCargoItems",
                columns: new[] { "DispatchManifestId", "CargoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trucks_PlateNumber",
                table: "Trucks",
                column: "PlateNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManifestCargoItems");

            migrationBuilder.DropTable(
                name: "Cargoes");

            migrationBuilder.DropTable(
                name: "DispatchManifests");

            migrationBuilder.DropTable(
                name: "Trucks");
        }
    }
}
