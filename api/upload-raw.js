export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ ok:false, error:"POST only" });
  }

  let size = 0;

  await new Promise((resolve, reject) => {
    req.on("data", chunk => {
      size += chunk.length;
    });

    req.on("end", resolve);
    req.on("error", reject);
  });

  res.status(200).json({
    ok:true,
    message:"data received",
    size
  });
}
