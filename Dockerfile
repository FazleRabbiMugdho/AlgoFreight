FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
ENV NUGET_PACKAGES=/tmp/nuget

COPY backend/AlgoFreight.sln ./
COPY backend/AlgoFreight.Domain/AlgoFreight.Domain.csproj AlgoFreight.Domain/
COPY backend/AlgoFreight.Application/AlgoFreight.Application.csproj AlgoFreight.Application/
COPY backend/AlgoFreight.Infrastructure/AlgoFreight.Infrastructure.csproj AlgoFreight.Infrastructure/
COPY backend/AlgoFreight.Api/AlgoFreight.Api.csproj AlgoFreight.Api/
COPY backend/AlgoFreight.Tests/AlgoFreight.Tests.csproj AlgoFreight.Tests/

COPY backend/ .
RUN dotnet restore && dotnet build -c Release

FROM build AS publish
RUN dotnet publish AlgoFreight.Api/AlgoFreight.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AlgoFreight.Api.dll"]
