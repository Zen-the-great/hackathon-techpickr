import { spawn } from "node:child_process";
import process from "node:process";

console.log("[TechPickr] Starting Gemini backend and Vite frontend concurrently...");

const backend = spawn("node", ["server/index.js"], {
  stdio: "inherit",
  shell: true,
});

const isWindows = process.platform === "win32";
const viteCmd = isWindows ? "npx.cmd" : "npx";
const frontend = spawn(viteCmd, ["vite"], {
  stdio: "inherit",
  shell: true,
});

function cleanup() {
  console.log("\n[TechPickr] Shutting down servers...");
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
backend.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`[TechPickr] Backend exited with code ${code}`);
  }
});
