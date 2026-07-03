FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY AlgoFreight.sln ./
COPY AlgoFreight.Domain/AlgoFreight.Domain.csproj AlgoFreight.Domain/
COPY AlgoFreight.Application/AlgoFreight.Application.csproj AlgoFreight.Application/
COPY AlgoFreight.Infrastructure/AlgoFreight.Infrastructure.csproj AlgoFreight.Infrastructure/
COPY AlgoFreight.Api/AlgoFreight.Api.csproj AlgoFreight.Api/
COPY AlgoFreight.Tests/AlgoFreight.Tests.csproj AlgoFreight.Tests/

RUN dotnet restore

COPY . .
RUN dotnet build -c Release --no-restore

FROM build AS publish
RUN dotnet publish AlgoFreight.Api/AlgoFreight.Api.csproj -c Release -o /app/publish --no-build

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AlgoFreight.Api.dll"]
