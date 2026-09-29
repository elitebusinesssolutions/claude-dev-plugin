# Aspire AppHost

The AppHost holds no Key Vault resource. It only sets the vault URL as an environment variable on the Api resource. The Api then loads its own vault. See [dotnet.md](dotnet.md).

Add this call to the `api` project resource in the AppHost `Program.cs`:

```csharp
.WithEnvironment(context =>
{
    if (context.ExecutionContext.IsRunMode)
    {
        context.EnvironmentVariables["KeyVaultUrl"] = "https://<api-vault>.vault.azure.net/";
    }
})
```

Aspire writes resource environment variables into publish manifests. The `IsRunMode` check keeps the development vault URL out of a deployed Api.

Rules:

- Chain the call onto the `AddProject` resource of the Api. Keep the terminating `;`. If the resource has no variable, do not add one.
- Put `.WithEnvironment(...)` after the last existing call in the chain of the resource and before the `;`. Use its own line and the same indentation as the other calls.
- Use the vault URL of the Api app from the inputs of `SKILL.md`.
- Set `KeyVaultUrl` only on .NET resources that load a vault.
- Next.js resources set nothing here. Each Next.js app reads `KEY_VAULT_URL` from its own `.env.local`. See [nextjs.md](nextjs.md).
- Do not wire the Functions app into the AppHost when the Functions host must read vault-backed trigger keys. See [dotnet.md](dotnet.md).
- Do not add a database or storage emulator resource for a secret that lives in the vault.
