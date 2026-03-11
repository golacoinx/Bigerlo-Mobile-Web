const fs = require("fs");
const { spawn } = require("child_process");

function clearMetroCache() {
  console.log("Clearing Metro cache...");

  const cacheDirs = [
    ...fs.globSync(".metro-cache"),
    ...fs.globSync("node_modules/.cache/metro"),
  ];

  for (const dir of cacheDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  console.log("Cache cleared");
}

async function checkMetroHealth() {
  try {
    const response = await fetch("http://localhost:8081/status", {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function startMetro(expoPublicDomain, { setMetroProcess }) {
  const isRunning = await checkMetroHealth();
  if (isRunning) {
    console.log("Metro already running");
    return;
  }

  console.log("Starting Metro...");
  console.log(`Setting EXPO_PUBLIC_DOMAIN=${expoPublicDomain}`);
  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: expoPublicDomain,
  };
  const metroProcess = spawn("npm", ["run", "expo:start:static:build"], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    env,
  });

  setMetroProcess(metroProcess);

  if (metroProcess.stdout) {
    metroProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[Metro] ${output}`);
    });
  }
  if (metroProcess.stderr) {
    metroProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.error(`[Metro Error] ${output}`);
    });
  }

  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const healthy = await checkMetroHealth();
    if (healthy) {
      console.log("Metro ready");
      return;
    }
  }

  console.error("Metro timeout");
  process.exit(1);
}

module.exports = {
  clearMetroCache,
  checkMetroHealth,
  startMetro,
};
