import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});

export async function POST(req) {
  try {
    const { key } = await req.json();
    if (!key) return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });

    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Delete error:", err);
    return new Response(JSON.stringify({ error: "Failed to delete video" }), { status: 500 });
  }
}
