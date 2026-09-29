# Next.js apps

Each app gets one helper file and one `instrumentation.ts` gate. Do not create a shared package. Do not edit `pnpm-workspace.yaml` or the root `package.json`. Keep the lockfile changes that `<pm> add` makes.

`<pm>` means the package manager of the app. Read it from the lockfile: `pnpm-lock.yaml` is pnpm, `yarn.lock` is yarn, `package-lock.json` is npm. If none exists, ask the developer.

`<source root>` means the `src` folder when the app has one. Otherwise it means the app root.

## 1. Add the helper

Do these steps for each Next.js app.

1. In the app folder, run `<pm> add @azure/identity @azure/keyvault-secrets`. This installs the newest stable versions.
2. If the `package.json` of the app has no `test` script, run `<pm> add -D vitest` in the app folder. Do this even when a root `package.json` lists vitest. Then add `"test": "vitest run"` to its `scripts`. If the app has a `test` script that runs vitest, do not add vitest. If the `test` script runs another test runner, ask the developer.
3. Write the code below to `<source root>/lib/keyvault-dev-secrets.ts`. Replace `<README path>` with the README path from the inputs.

```ts
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

/** Converts a Key Vault secret name (dash-case) to its env var name (SCREAMING_SNAKE_CASE). */
function toEnvVarName(secretName: string): string {
  return secretName.replace(/-/g, "_").toUpperCase();
}

/**
 * Loads every secret in the calling app's own Key Vault into process.env, for local dev only.
 * Skips a secret whose env var is already set (e.g. from the app's own .env.local), so a
 * developer can override any one value, or all of them, without editing the vault. Adding a new
 * secret to the vault needs no change here.
 * @param vaultUrl - the calling app's own Key Vault URL, e.g. `https://<vault>.vault.azure.net/`.
 */
export async function loadDevSecretsFromKeyVault(vaultUrl: string): Promise<void> {
  try {
    const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
    for await (const secretProperties of client.listPropertiesOfSecrets()) {
      if (secretProperties.enabled === false) {
        continue;
      }
      const envVar = toEnvVarName(secretProperties.name);
      if (process.env[envVar] !== undefined) {
        continue;
      }
      const secret = await client.getSecret(secretProperties.name);
      if (!secret.value) {
        throw new Error(`Key Vault secret ${secretProperties.name} has no value.`);
      }
      process.env[envVar] = secret.value;
    }
  } catch (error) {
    console.error(
      `Failed to load dev secrets from ${vaultUrl}. Confirm az login and the Key Vault Secrets User role, see <README path>#local-dev-secrets-azure-key-vault.`
    );
    throw error;
  }
}
```

4. Write the test below to `<source root>/lib/keyvault-dev-secrets.test.ts`. Copy it exactly.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const secrets = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));

vi.mock("@azure/identity", () => ({ DefaultAzureCredential: class {} }));
vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class {
    listPropertiesOfSecrets = secrets.list;
    getSecret = secrets.get;
  }
}));

import { loadDevSecretsFromKeyVault } from "./keyvault-dev-secrets";

async function* properties(...items: { name: string; enabled?: boolean }[]) {
  yield* items;
}

describe("loadDevSecretsFromKeyVault", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MY_SECRET;
  });

  it("maps a dash-case name to an upper-case env var", async () => {
    secrets.list.mockReturnValue(properties({ name: "my-secret" }));
    secrets.get.mockResolvedValue({ value: "from-vault" });
    await loadDevSecretsFromKeyVault("https://vault.example/");
    expect(process.env.MY_SECRET).toBe("from-vault");
  });

  it("skips a disabled secret", async () => {
    secrets.list.mockReturnValue(properties({ name: "my-secret", enabled: false }));
    await loadDevSecretsFromKeyVault("https://vault.example/");
    expect(secrets.get).not.toHaveBeenCalled();
  });

  it("does not overwrite a preset env var", async () => {
    process.env.MY_SECRET = "from-env";
    secrets.list.mockReturnValue(properties({ name: "my-secret" }));
    await loadDevSecretsFromKeyVault("https://vault.example/");
    expect(process.env.MY_SECRET).toBe("from-env");
    expect(secrets.get).not.toHaveBeenCalled();
  });

  it("throws when a secret has no value", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    secrets.list.mockReturnValue(properties({ name: "my-secret" }));
    secrets.get.mockResolvedValue({ value: "" });
    await expect(loadDevSecretsFromKeyVault("https://vault.example/")).rejects.toThrow(
      "has no value"
    );
  });
});
```

## 2. Add the gate

Put the gate in `<source root>/instrumentation.ts`.

- If the file is missing, create it with the template below.
- If the file exists, keep its code. Add the gate to `register()` as a separate `if (process.env.NEXT_RUNTIME !== "edge") { ... }` block next to the existing code. Do not wrap the existing code in it. If `register()` already has such a block, add the `NODE_ENV` block inside it.

```ts
/**
 * Loads this app's secrets from its own Key Vault in local dev, once per server instance.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    if (process.env.NODE_ENV === "development") {
      if (!process.env.KEY_VAULT_URL) {
        throw new Error("KEY_VAULT_URL is not set. Add it to .env.local.");
      }
      const { loadDevSecretsFromKeyVault } = await import("./lib/keyvault-dev-secrets");
      await loadDevSecretsFromKeyVault(process.env.KEY_VAULT_URL);
    }
  }
}
```

Rules:

- Import the helper with a dynamic `import()` so it never loads outside dev.
- Next.js 15 and newer load `instrumentation.ts` by default. For an older version, tell the developer to set `experimental.instrumentationHook` to `true` in the Next.js config.
- Each app uses its own vault. Do not read or create `.env.local`. Tell the developer to add `KEY_VAULT_URL=<vault URL of that app>` to the `.env.local` of that app. Do not add the value to `.env.example`.

## 3. Check

1. Run `npx tsc --noEmit` for npm, `pnpm exec tsc --noEmit` for pnpm, or `yarn tsc --noEmit` for yarn.
2. Run `<pm> test`.

Report a failure. Do not work around it.

One exception: pnpm can exit with `ERR_PNPM_IGNORED_BUILDS` after `pnpm add` already wrote the packages to `package.json`. Continue. Do not run `pnpm approve-builds`. Tell the developer that pnpm ignored build scripts.
