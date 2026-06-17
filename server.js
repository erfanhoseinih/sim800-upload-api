const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// حداکثر حجم فایل.
// برای تست SIM800L فعلاً کوچک بگیر.
// اینجا 2MB گذاشته شده.
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

// مسیر ذخیره فایل‌ها
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// صفحه اصلی
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "SIM800L Upload API",
    endpoints: {
      ping: "GET /ping",
      uploadRaw: "POST /upload-raw?name=test.jpg",
      uploadMultipart: "POST /upload with form-data field name: file",
      list: "GET /files",
      download: "GET /files/:filename"
    }
  });
});

// تست سلامت سرور
app.get("/ping", (req, res) => {
  res.json({
    ok: true,
    message: "pong",
    time: new Date().toISOString()
  });
});

// پاکسازی نام فایل برای جلوگیری از path traversal
function safeFileName(name) {
  const fallback = `upload_${Date.now()}.bin`;

  if (!name || typeof name !== "string") {
    return fallback;
  }

  name = name.trim();

  if (!name) {
    return fallback;
  }

  // حذف کاراکترهای خطرناک
  name = name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // جلوگیری از فایل مخفی یا مسیرهای عجیب
  if (name.includes("..") || name.startsWith(".")) {
    return fallback;
  }

  return name;
}

// دریافت فایل خام؛ مناسب‌تر برای SIM800L
app.post("/upload-raw", (req, res) => {
  const filename = safeFileName(req.query.name || `raw_${Date.now()}.bin`);
  const filepath = path.join(uploadDir, filename);

  let receivedBytes = 0;
  const chunks = [];

  req.on("data", (chunk) => {
    receivedBytes += chunk.length;

    if (receivedBytes > MAX_SIZE_BYTES) {
      req.destroy();
      return;
    }

    chunks.push(chunk);
  });

  req.on("end", () => {
    if (receivedBytes === 0) {
      return res.status(400).json({
        ok: false,
        error: "No data received"
      });
    }

    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(filepath, buffer);

    res.json({
      ok: true,
      message: "raw file received",
      filename,
      size: receivedBytes,
      url: `/files/${filename}`,
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

// دریافت multipart/form-data برای تست با Postman یا مرورگر
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "upload", ext);
    const filename = safeFileName(`${base}_${Date.now()}${ext}`);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE_BYTES
  }
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: "No file uploaded. Use form-data field name: file"
    });
  }

  res.json({
    ok: true,
    message: "multipart file received",
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    url: `/files/${req.file.filename}`,
    time: new Date().toISOString()
  });
});

// لیست فایل‌های آپلود شده
app.get("/files", (req, res) => {
  const files = fs.readdirSync(uploadDir).map((filename) => {
    const stat = fs.statSync(path.join(uploadDir, filename));
    return {
      filename,
      size: stat.size,
      url: `/files/${filename}`,
      modified: stat.mtime
    };
  });

  res.json({
    ok: true,
    count: files.length,
    files
  });
});

// دانلود یا مشاهده فایل
app.get("/files/:filename", (req, res) => {
  const filename = safeFileName(req.params.filename);
  const filepath = path.join(uploadDir, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({
      ok: false,
      error: "File not found"
    });
  }

  res.sendFile(filepath);
});

// هندل خطاهای کلی
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    ok: false,
    error: err.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`SIM800L Upload API running on port ${PORT}`);
});
