import { execFileSync } from "node:child_process";

let remote = "";
try {
  remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
} catch {
  // A checkout without Git metadata cannot identify the project safely.
}

if (!/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)ramondavi\/pronto(?:\.git)?\/?$/i.test(remote)) {
  console.error("Este não é o clone público do Pronto! (ramondavi/pronto). Abra a raiz do repositório correto antes de iniciar o servidor.");
  process.exitCode = 1;
}
