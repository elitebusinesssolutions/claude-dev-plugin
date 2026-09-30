# .NET Api and Functions

Applies to each ASP.NET Core Api and each isolated-worker Functions app.

## 1. Add packages

Add both packages to the csproj of each app. Pin the versions in the csproj. If the repo has a `Directory.Packages.props`, write the versions there and leave `Version` out of the `PackageReference`.

```xml
<PackageReference Include="Azure.Extensions.AspNetCore.Configuration.Secrets" Version="x.y.z" />
<PackageReference Include="Azure.Identity" Version="x.y.z" />
```

Always use the newest stable version of each package. Take the highest version that has no `-` suffix. Sort by version, not by list position.

1. Find the version. For example, run `dotnet package search <package id> --exact-match --format json`.
2. Write that version in the csproj.
3. Tell the developer which version you chose.
4. Run `dotnet build`. Stop and report a restore error.

Make sure each csproj has a `<UserSecretsId>` in the first `<PropertyGroup>` that has a `<TargetFramework>`. Without it, `AddUserSecrets<Program>()` throws at startup when `KeyVaultUrl` is set. If the element is missing, add one with a new GUID. Make the GUID with `[guid]::NewGuid()` in PowerShell.

```xml
<UserSecretsId>new-guid</UserSecretsId>
```

## 2. Add the vault block to Program.cs

Place the block right after `builder.AddServiceDefaults()` when the file calls it. Otherwise place it right after `WebApplication.CreateBuilder(args)` (or the Functions host builder). In both cases the block goes before any service reads configuration.

```csharp
// Local dev only, set by the AppHost, launchSettings.json, or local.settings.json (Functions).
// Not IsDevelopment() — a hosted environment can also run with
// ASPNETCORE_ENVIRONMENT=Development and would wire in this vault too.
var keyVaultUrl = builder.Configuration["KeyVaultUrl"];
if (!string.IsNullOrEmpty(keyVaultUrl))
{
    builder.Configuration.AddAzureKeyVault(new Uri(keyVaultUrl), new DefaultAzureCredential());

    // Re-added after Key Vault so a developer's own user secrets win per key, without
    // editing the vault, while every key still falls back to Key Vault when not overridden.
    builder.Configuration.AddUserSecrets<Program>();
}
```

Rules:

- Gate on the `KeyVaultUrl` configuration value. Never gate on `IsDevelopment()`.
- Call `AddUserSecrets<Program>()` after `AddAzureKeyVault`. The order makes user secrets win.
- Add `using Azure.Identity;` at the top of the file.
- Use block-bodied code. Follow the code conventions of the target project.

### Functions apps on the `HostBuilder` template

If the Functions `Program.cs` uses `new HostBuilder().ConfigureFunctionsWorkerDefaults()` and not `FunctionsApplication.CreateBuilder(args)`, `builder.Configuration` does not exist. Chain this call right after `ConfigureFunctionsWorkerDefaults()`:

```csharp
.ConfigureAppConfiguration(config =>
{
    // Local dev only, set in local.settings.json. Not IsDevelopment() — a hosted
    // environment can also run as Development and would wire in this vault too.
    var keyVaultUrl = config.Build()["KeyVaultUrl"];
    if (!string.IsNullOrEmpty(keyVaultUrl))
    {
        config.AddAzureKeyVault(new Uri(keyVaultUrl), new DefaultAzureCredential());

        // Re-added after Key Vault so a developer's own user secrets win per key.
        config.AddUserSecrets<Program>();
    }
})
```

`config.Build()` reads the sources added so far, which include the `local.settings.json` values that the Functions tools pass in as environment variables.

## 3. Api: where `KeyVaultUrl` comes from

The Aspire AppHost sets it. See [apphost.md](apphost.md). Without an AppHost, set `KeyVaultUrl` in `launchSettings.json` as an environment variable.

## 4. Functions: extra limit

The Functions host resolves trigger and binding settings. The host cannot read Key Vault. Only the worker `IConfiguration` sees vault values.

- Set `KeyVaultUrl` in `local.settings.json` under `Values`.
- Set each trigger connection key (for example `StorageSettings:ConnectionString`) as a user secret too. Copy the value from the vault with the setup script. See [setup-script.md](setup-script.md).
- Do not wire Functions into the AppHost when the host must read these keys.
- Document this limit in the Functions README.

## 5. Build

Run `dotnet build` on each changed project. Stop and report a compile error. Do not work around it.
