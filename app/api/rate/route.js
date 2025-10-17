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
    const { key, rating } = await req.json();

    if (!key || typeof rating !== "number") {
      return new Response(JSON.stringify({ error: "Missing key or rating" }), { status: 400 });
    }
    if (rating < 1 || rating > 10) {
      return new Response(JSON.stringify({ error: "Rating must be 1–10" }), { status: 400 });
    }

    const metaKey = `${key}.meta.json`;
    const body = JSON.stringify({ rating, updatedAt: new Date().toISOString() });

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: metaKey,
        Body: body,
        ContentType: "application/json",
      })
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Rate error:", err);
    return new Response(JSON.stringify({ error: "Failed to save rating" }), { status: 500 });
  }
}
