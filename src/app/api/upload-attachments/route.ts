import { NextResponse } from 'next/server';
import { attachmentsStore } from '../attachments-store';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: true, uploadId: null, files: [] });
    }

    const uploadId = crypto.randomUUID();
    const attachmentFiles = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachmentFiles.push({
        filename: file.name,
        content: buffer,
        contentType: file.type || 'application/octet-stream',
      });
    }

    attachmentsStore.set(uploadId, attachmentFiles);

    return NextResponse.json({
      success: true,
      uploadId,
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    if (uploadId) {
      attachmentsStore.delete(uploadId);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear attachments cache' },
      { status: 500 }
    );
  }
}
