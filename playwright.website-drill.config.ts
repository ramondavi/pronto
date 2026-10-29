import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (process.env.PRONTO_WEBSITE_DRILL !== "1") throw new Error("Explicit synthetic website fixture required");
const fixture = JSON.parse(readFileSync("tmp/website-drill-state.json", "utf8"));
const url = new URL(fixture.website_url);
if (!fixture.website_synthetic_only || !fixture.ports_loopback_only || url.hostname !== "127.0.0.1" || url.protocol !== "http:" || url.username || url.password || !/^pronto-auth-drill-[0-9a-f]{10}$/.test(fixture.project) || !/^[0-9a-f]{64}$/.test(fixture.container)) {
  throw new Error("Owned loopback synthetic fixture required");
}
const source = JSON.parse(execFileSync("docker", ["inspect", fixture.container], { encoding: "utf8" }))[0];
if (source.Config.Labels["com.supabase.cli.project"] !== fixture.project ||
    !Object.values(source.NetworkSettings.Ports).every(values =>
      values === null || (Array.isArray(values) && values.every(binding => binding.HostIp === "127.0.0.1")))) {
  throw new Error("Synthetic source ownership or loopback binding not confirmed");
}
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "website-recovery-drill.spec.ts", workers: 1, retries: 0,
  timeout: 120_000, expect: { timeout: 60_000 }, reporter: "list",
  outputDir: "tmp/website-drill-results",
  use: { baseURL: fixture.website_url, locale: "pt-BR", trace: "off", video: "off", screenshot: "off" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "celular", use: { ...devices["Pixel 7"] } }],
});
