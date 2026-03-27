// utils/selfPing.js
// Same file for QuizNova, PesiGo, RecipeSharingApp — copy as-is, no changes.

import fetch from "node-fetch";

let pingInterval = null;

export const startSelfPing = (backendUrl) => {
  if (pingInterval) return;

  const url = backendUrl || process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;

  if (!url) {
    console.warn("[SelfPing] ⚠️  No BACKEND_URL set. Add BACKEND_URL=https://your-app.onrender.com in Render env vars.");
    return;
  }

  const healthUrl = `${url.replace(/\/$/, "")}/api/health`;
  console.log(`[SelfPing] ✅ Started. Pinging ${healthUrl} every 14 minutes.`);

  const doPing = async () => {
    try {
      const res = await fetch(healthUrl, { method: "GET" });
      console.log(`[SelfPing] 🏓 Ping OK — ${new Date().toISOString()} (status: ${res.status})`);
    } catch (err) {
      console.warn("[SelfPing] ⚠️  Ping failed:", err.message);
    }
  };

  doPing();
  pingInterval = setInterval(doPing, 14 * 60 * 1000);
};

export const stopSelfPing = () => {
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
};
