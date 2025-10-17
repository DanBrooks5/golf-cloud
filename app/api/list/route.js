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

    // List all items under videos/
    const { Contents = [] } = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: "videos/" })
    );

    const videos = Contents.filter((o) => o.Key && !o.Key.endsWith(".meta.json"));
    const metas  = Contents.filter((o) => o.Key &&  o.Key.endsWith(".meta.json"));

    // Build a metadata map (rating, tags, notes, favorite)
    const metaMap = {};
    await Promise.all(
      metas.map(async (m) => {
        try {
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucket, Key: m.Key }),
            { expiresIn: 120 }
          );
          const resp = await fetch(url);
          if (!resp.ok) return;
          const json = await resp.json().catch(() => null);
          if (!json) return;
          const baseKey = m.Key.replace(/\.meta\.json$/, "");
          metaMap[baseKey] = {
            rating:   json.rating   ?? null,
            tags:     json.tags     ?? [],
            notes:    json.notes    ?? "",
            favorite: json.favorite ?? false,
          };
        } catch { /* ignore individual errors */ }
      })
    );

    // Sort newest first
    videos.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));

    // Combine video + metadata
    const items = await Promise.all(
      videos.map(async (item) => {
        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: bucket, Key: item.Key }),
          { expiresIn: 300 }
        );
        const meta = metaMap[item.Key] || {};
        return {
          key: item.Key,
          url,
          lastModified: item.LastModified,
          size: item.Size,
          rating:   meta.rating   ?? null,
          tags:     meta.tags     ?? [],
          notes:    meta.notes    ?? "",
          favorite: meta.favorite ?? false,
        };
      })
    );

    return Response.json({ items });
  } catch (err) {
    console.error("List error:", err);
    return new Response(JSON.stringify({ error: "Failed to list videos" }), { status: 500 });
  }
}
