const http = require("http");
const fs = require("fs");

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/upload") {
    const chunks = [];

    req.on("data", chunk => chunks.push(chunk));

    req.on("end", () => {
      const body = Buffer.concat(chunks);
      console.log("Received bytes:", body.length);

      fs.writeFileSync(`frame_${Date.now()}.bin`, body);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        received: body.length
      }));
    });

    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(80, "0.0.0.0", () => {
  console.log("HTTP upload server running on port 80");
});
