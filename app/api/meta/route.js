import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Save or update metadata
export async function POST(req) {
  try {
    const { key, rating, tags, notes, favorite } = await req.json();
    if (!key) return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });

    const metaKey = `${key}.meta.json`;
    const body = JSON.stringify(
      { rating, tags, notes, favorite, updatedAt: new Date().toISOString() },
      null,
      2
    );

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
    console.error("Meta save error:", err);
    return new Response(JSON.stringify({ error: "Failed to save metadata" }), { status: 500 });
  }
}

// Fetch metadata for a single video
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });

    const metaKey = `${key}.meta.json`;
    const res = await s3.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: metaKey })
    );
    const text = await res.Body.transformToString();
    const json = JSON.parse(text);
    return Response.json(json);
  } catch (err) {
    return new Response(JSON.stringify({ error: "No metadata yet" }), { status: 404 });
  }
}
