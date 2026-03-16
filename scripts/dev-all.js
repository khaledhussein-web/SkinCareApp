import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const nodeCmd = process.execPath;
const viteCli = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");

const pythonCmd = process.env.FASTAPI_PYTHON_CMD || "python";
const dryRun = process.argv.includes("--dry-run");

const processes = [];
let shuttingDown = false;

function color(label) {
  const palette = {
    frontend: "\x1b[35m",
    backend: "\x1b[36m",
    fastapi: "\x1b[32m",
    system: "\x1b[33m",
  };
  return palette[label] || "\x1b[37m";
}

function log(label, message) {
  const prefix = `${color(label)}[${label}]\x1b[0m`;
  process.stdout.write(`${prefix} ${message}\n`);
}

function wireStream(child, label) {
  child.stdout?.on("data", (chunk) => {
    const text = String(chunk).replace(/\r?\n$/, "");
    if (text) log(label, text);
  });
  child.stderr?.on("data", (chunk) => {
    const text = String(chunk).replace(/\r?\n$/, "");
    if (text) log(label, text);
  });
}

function launch(name, command, args, cwd) {
  if (dryRun) {
    log("system", `DRY RUN -> ${name}: (${cwd}) ${command} ${args.join(" ")}`);
    return null;
  }

  log("system", `Starting ${name}...`);
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  processes.push({ name, child });
  wireStream(child, name);

  child.on("error", (error) => {
    log("system", `${name} failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const exitInfo = signal ? `signal ${signal}` : `code ${code}`;
    log("system", `${name} exited with ${exitInfo}. Stopping all services...`);
    shutdown(code ?? 1);
  });

  return child;
}

function terminateProcessTree(pid) {
  if (!pid) return Promise.resolve();
  if (process.platform !== "win32") {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore if already stopped
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    killer.on("exit", () => resolve());
    killer.on("error", () => resolve());
  });
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  const stopTargets = processes.map(({ child }) => terminateProcessTree(child.pid));
  await Promise.all(stopTargets);
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const frontend = launch("frontend", nodeCmd, [viteCli], rootDir);
const backend = launch("backend", nodeCmd, ["--watch", "server.js"], backendDir);
const fastapi = launch("fastapi", pythonCmd, ["fastapi_service.py"], backendDir);

if (dryRun) {
  process.exit(0);
}

if (!frontend || !backend || !fastapi) {
  shutdown(1);
}
