import { spawn } from "node:child_process";
import { closeSync, mkdirSync, mkdtempSync, openSync, statSync, writeFileSync, createReadStream } from "node:fs";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

export type Step = { name: string; command: string; args: string[] };
export const checks = ["test", "typecheck", "lint", "build"] as const;

export async function verify({ steps, directory, cwd = process.cwd(), emit = console.log }: {
  steps: Step[]; directory: string; cwd?: string; emit?: (line: string) => void;
}) {
  mkdirSync(directory, { recursive: true });
  const runDirectory = mkdtempSync(join(directory, "run-"));
  const results = [];
  for (const [index, step] of steps.entries()) {
    const log = join(runDirectory, `${index + 1}-${step.name}.log`);
    const fd = openSync(log, "wx");
    const start = Date.now();
    emit(`RUN ${step.name}`);
    let launchError: string | undefined;
    let exitCode: number;
    try {
      exitCode = await new Promise<number>((done) => {
        const child = spawn(step.command, step.args, {
          cwd, shell: false, windowsHide: true, stdio: ["ignore", fd, fd],
          env: { ...process.env, NO_COLOR: "1" },
        });
        child.on("error", (error: NodeJS.ErrnoException) => {
          launchError = error.code ?? "LAUNCH_ERROR";
          done(1);
        });
        child.on("close", (code) => done(code ?? 1));
      });
    } finally {
      closeSync(fd);
    }
    let warningLines = 0;
    let testSummary: string | undefined;
    // Inspect locally without putting raw output or diagnostics into model context.
    for await (const line of createInterface({ input: createReadStream(log), crlfDelay: Infinity })) {
      if (/\bwarn(?:ing|ings)?\b/i.test(line)) warningLines++;
      const count = line.match(/^[#ℹ]\s*(tests|pass|fail|skipped)\s+(\d+)\s*$/);
      if (count) testSummary = `${testSummary ? `${testSummary}; ` : ""}${count[1]}=${count[2]}`;
    }
    const result = { name: step.name, exitCode, launchError, warningLines, testSummary,
      durationMs: Date.now() - start, log, logBytes: statSync(log).size };
    results.push(result);
    emit(`${exitCode === 0 ? "PASS" : "FAIL"} ${step.name}: exit=${exitCode}; warning-lines=${warningLines}${launchError ? `; ${launchError}` : ""}${testSummary ? `; ${testSummary}` : ""}; log=${log}`);
  }
  const report = { completedAt: new Date().toISOString(), ok: results.every((r) => r.exitCode === 0), results };
  const reportPath = join(runDirectory, "summary.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  emit(`REPORT ${reportPath}`);
  return report;
}

export function selectChecks(args: string[]) {
  if (args.length === 0) return [...checks];
  if (args[0] !== "--only" || args.length < 2 || args.slice(1).some((a) => !checks.includes(a as typeof checks[number]))) {
    throw new Error("Use npm run verify ou npm run verify -- --only test typecheck lint build.");
  }
  return [...new Set(args.slice(1))];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const selected = selectChecks(process.argv.slice(2));
    const npm = process.env.npm_execpath;
    if (!npm) throw new Error("Execute pelo npm: npm run verify.");
    const report = await verify({
      directory: resolve("tmp/verification"),
      steps: selected.map((name) => ({ name, command: process.execPath, args: [npm, "run", name] })),
    });
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Falha na verificação.");
    process.exitCode = 1;
  }
}
