module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // GET /api/ping
    if (req.method === "GET" && pathname === "/api/ping") {
      return res.status(200).json({
        ok: true,
        message: "pong",
        time: new Date().toISOString()
      });
    }

    // GET /api
    if (req.method === "GET" && (pathname === "/api" || pathname === "/api/")) {
      return res.status(200).json({
        ok: true,
        service: "SIM800L Upload API on Vercel",
        endpoints: {
          ping: "GET /api/ping",
          uploadRaw: "POST /api/upload-raw?name=test.txt"
        }
      });
    }

    // POST /api/upload-raw
    if (req.method === "POST" && pathname === "/api/upload-raw") {
      const chunks = [];
      let total = 0;
      const MAX_SIZE_BYTES = 2 * 1024 * 1024;

      await new Promise((resolve, reject) => {
        req.on("data", (chunk) => {
          total += chunk.length;

          if (total > MAX_SIZE_BYTES) {
            reject(new Error("Payload too large"));
            return;
          }

          chunks.push(chunk);
        });

        req.on("end", resolve);
        req.on("error", reject);
      });

      const filename = url.searchParams.get("name") || `raw_${Date.now()}.bin`;

      return res.status(200).json({
        ok: true,
        message: "raw data received",
        filename,
        size: total,
        time: new Date().toISOString()
      });
    }

    return res.status(404).json({
      ok: false,
      error: "Not found",
      path: pathname,
      method: req.method
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error"
    });
  }
};