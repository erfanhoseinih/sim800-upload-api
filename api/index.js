const express = require("express");

const app = express();

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

// صفحه اصلی
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "SIM800L Upload API on Vercel",
    endpoints: {
      ping: "GET /api/ping",
      uploadRaw: "POST /api/upload-raw?name=test.txt"
    }
  });
});

// تست سلامت
app.get("/ping", (req, res) => {
  res.json({
    ok: true,
    message: "pong",
    time: new Date().toISOString()
  });
});

// دریافت خام مناسب SIM800L
app.post("/upload-raw", (req, res) => {
  let receivedBytes = 0;
  const chunks = [];

  req.on("data", (chunk) => {
    receivedBytes += chunk.length;

    if (receivedBytes > MAX_SIZE_BYTES) {
      return res.status(413).json({
        ok: false,
        error: "Payload too large"
      });
    }

    chunks.push(chunk);
  });

  req.on("end", () => {
    const buffer = Buffer.concat(chunks);

    const filename = req.query.name || `raw_${Date.now()}.bin`;

    console.log("Raw upload received:", {
      filename,
      size: receivedBytes,
      preview: buffer.slice(0, 100).toString("hex")
    });

    res.json({
      ok: true,
      message: "raw data received",
      filename,
      size: receivedBytes,
      time: new Date().toISOString()
    });
  });

  req.on("error", (err) => {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  });
});

module.exports = app;
