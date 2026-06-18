import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ ok:false, error:"POST only"});
  }

  const chunks = [];

  await new Promise((resolve, reject) => {
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", resolve);
    req.on("error", reject);
  });

  const buffer = Buffer.concat(chunks);

  const uploadsDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir,{recursive:true});

  const id = Date.now();

  const binName = `frame_${id}.bin`;
  const pngName = `frame_${id}.png`;

  const binPath = path.join(uploadsDir, binName);
  const pngPath = path.join(uploadsDir, pngName);

  fs.writeFileSync(binPath, buffer);

  // فرض: تصویر 80x60 grayscale
  const width = 80;
  const height = 60;

  const png = new PNG({width,height});

  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){

      const gray = buffer[y*width + x];
      const idx = (y*width + x) * 4;

      png.data[idx] = gray;
      png.data[idx+1] = gray;
      png.data[idx+2] = gray;
      png.data[idx+3] = 255;
    }
  }

  png.pack().pipe(fs.createWriteStream(pngPath));

  res.status(200).json({
    ok:true,
    fileName:binName,
    imageUrl:`/uploads/${pngName}`
  });
}
