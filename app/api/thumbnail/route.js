import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const { key, dataUrl } = await req.json();
    if (!key || !dataUrl) {
      return new Response(JSON.stringify({ error: "Missing key or dataUrl" }), { status: 400 });
    }

    // Convert base64 → buffer
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const thumbKey = `${key}.thumb.jpg`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: thumbKey,
        Body: buffer,
        ContentType: "image/jpeg",
      })
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Thumbnail upload error:", err);
    return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500 });
  }
}
