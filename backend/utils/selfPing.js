let pingInterval = null;

export const startSelfPing = (backendUrl) => {
  if (pingInterval) return;

  const url =
    backendUrl ||
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL;

  if (!url) {
    console.warn(
      "[SelfPing] ⚠️ No BACKEND_URL set. Add BACKEND_URL in Render env"
    );
    return;
  }

  const healthUrl = `${url.replace(/\/$/, "")}/api/health`;

  console.log(
    `[SelfPing] ✅ Started. Pinging ${healthUrl} every 14 minutes.`
  );

  const doPing = async () => {
    try {
      const res = await fetch(healthUrl);
      console.log(
        `[SelfPing] 🏓 Ping OK — ${new Date().toISOString()} (status: ${res.status})`
      );
    } catch (err) {
      console.warn("[SelfPing] ⚠️ Ping failed:", err.message);
    }
  };

  doPing();
  pingInterval = setInterval(doPing, 14 * 60 * 1000);
};
