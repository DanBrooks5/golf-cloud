import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Delete error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
