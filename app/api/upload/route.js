// app/api/upload/route.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    // Basic env validation to prevent silent 500s
    if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Missing AWS env vars. Ensure AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are set.",
        }),
        { status: 500 }
      );
    }

    const { name, type } = await req.json();
    if (!name || !type) {
      return new Response(JSON.stringify({ error: "Missing name or type" }), {
        status: 400,
      });
    }

    // Sanitize filename and namespace under /videos
    const safeName = String(name).replace(/[^\w.\-]+/g, "_");
    const key = `videos/${Date.now()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: type,
    });

    // 10 minutes
    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 600 });

    return Response.json({ uploadURL, key });
  } catch (err) {
    console.error("Upload URL error:", {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
    });
    return new Response(
      JSON.stringify({ error: "Failed to create upload URL" }),
      { status: 500 }
    );
  }
}

