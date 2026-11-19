#!/usr/bin/env node
// Dev server reachable from phones on the same Wi-Fi.
// Points the app (and the browser) at Supabase via this PC's LAN IP instead of
// 127.0.0.1, and allows that origin in Next's dev server. Development only.
import { spawn } from "node:child_process";
import os from "node:os";

const PORT = process.env.PORT ?? "3000";

function lanIp() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal || a.address.startsWith("169.254.")) continue;
      const virtual = /vethernet|virtualbox|vmware|wsl|docker|hyper-v|loopback/i.test(name);
      const wifi = /wi-?fi|wlan|wireless/i.test(name);
      candidates.push({ name, address: a.address, score: (wifi ? 2 : 0) + (virtual ? -5 : 0) });
    }
  }
  candidates.sort((x, y) => y.score - x.score);
  return candidates[0];
}

const ip = process.env.LAN_IP ? { address: process.env.LAN_IP, name: "LAN_IP" } : lanIp();
if (!ip) {
  console.error("No LAN IPv4 address found. Connect to Wi-Fi or set LAN_IP=192.168.x.y");
  process.exit(1);
}

const env = {
  ...process.env,
  DEV_LAN_HOST: ip.address,
  NEXT_PUBLIC_APP_URL: `http://${ip.address}:${PORT}`,
  NEXT_PUBLIC_SUPABASE_URL: `http://${ip.address}:54321`,
};

console.log(`\n  On your phone (same Wi-Fi as this PC, via ${ip.name}):`);
console.log(`    http://${ip.address}:${PORT}/t/demo-table-01   (tables 01 … 12)\n`);

const child = spawn("pnpm", ["exec", "next", "dev", "-H", "0.0.0.0", "-p", PORT], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
