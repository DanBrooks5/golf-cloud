import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET() {
  try {
    const bucket = process.env.S3_BUCKET;

    // List everything under videos/
    const { Contents = [] } = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: "videos/" })
    );

    // Split video objects vs. .meta.json objects
    const videos = Contents.filter(
      (o) => o.Key && !o.Key.endsWith(".meta.json")
    );
    const metas = Contents.filter((o) => o.Key && o.Key.endsWith(".meta.json"));

    // Build a map of ratings by reading each meta (they're tiny)
    const ratingMap = {};
    await Promise.all(
      metas.map(async (m) => {
        try {
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucket, Key: m.Key }),
            { expiresIn: 120 }
          );
          const resp = await fetch(url);
          if (resp.ok) {
            const json = await resp.json().catch(() => null);
            const baseKey = m.Key.replace(/\.meta\.json$/, "");
            if (json && typeof json.rating === "number") {
              ratingMap[baseKey] = json.rating;
            }
          }
        } catch {
          // ignore bad meta files
        }
      })
    );

    // newest first
    videos.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    );

    // Return items with short-lived playback URLs + rating
    const items = await Promise.all(
      videos.map(async (item) => {
        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: bucket, Key: item.Key }),
          { expiresIn: 300 }
        );
        return {
          key: item.Key,
          url,
          lastModified: item.LastModified,
          size: item.Size,
          rating: ratingMap[item.Key] ?? null,
        };
      })
    );

    return Response.json({ items });
  } catch (err) {
    console.error("List error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to list videos" }),
      { status: 500 }
    );
  }
}
