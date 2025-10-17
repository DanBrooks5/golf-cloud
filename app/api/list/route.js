import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});

export async function GET() {
  try {
    const bucket = process.env.S3_BUCKET;
    const { Contents = [] } = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "videos/" }));

    Contents.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));

    const items = await Promise.all(
      Contents.map(async (item) => {
        const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: item.Key }), { expiresIn: 300 });
        return { key: item.Key, url, lastModified: item.LastModified, size: item.Size };
      })
    );

    return Response.json({ items });
  } catch (err) {
    console.error("List error:", err);
    return new Response(JSON.stringify({ error: "Failed to list videos" }), { status: 500 });
  }
}

