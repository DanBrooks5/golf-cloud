import { NextRequest, NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, userId } = await req.json();
    if (!filename || !contentType || !userId) {
      return NextResponse.json({ error: 'Missing filename, contentType, or userId' }, { status: 400 });
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
    const key = `users/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Conditions: [
        ['content-length-range', 0, 1024 * 1024 * 500],
        { 'Content-Type': contentType }
      ],
      Fields: {
        'Content-Type': contentType
      },
      Expires: 60
    });

    const publicUrl = `${process.env.S3_PUBLIC_BASE_URL}/${key}`;
    return NextResponse.json({ url, fields, key, publicUrl }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to presign' }, { status: 500 });
  }
}
