export interface AttachmentFile {
  filename: string;
  content: Buffer;
  contentType: string;
}

const globalForAttachments = global as unknown as {
  attachmentsStore: Map<string, AttachmentFile[]>;
};

export const attachmentsStore =
  globalForAttachments.attachmentsStore || new Map<string, AttachmentFile[]>();

if (process.env.NODE_ENV !== 'production') {
  globalForAttachments.attachmentsStore = attachmentsStore;
}
