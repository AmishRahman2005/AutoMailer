import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { attachmentsStore } from '../attachments-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { smtpConfig, recipientEmail, subject, htmlContent, uploadId } = body;

    if (!smtpConfig || !recipientEmail || !subject || !htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (smtpConfig, recipientEmail, subject, or htmlContent).' },
        { status: 400 }
      );
    }

    const { host, port, secure, auth, fromName, fromEmail } = smtpConfig;

    if (!host || !port || !auth || !auth.user || !auth.pass) {
      return NextResponse.json(
        { success: false, error: 'Missing required SMTP config details.' },
        { status: 400 }
      );
    }

    // Initialize transporter
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: secure === true || secure === 'true',
      auth: {
        user: auth.user,
        pass: auth.pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });

    // Retrieve cached attachments if uploadId is provided
    let attachments: any[] = [];
    if (uploadId) {
      const cached = attachmentsStore.get(uploadId);
      if (cached) {
        attachments = cached.map((file) => ({
          filename: file.filename,
          content: file.content,
          contentType: file.contentType,
        }));
      }
    }

    const fromAddress = fromName
      ? `"${fromName}" <${fromEmail || auth.user}>`
      : fromEmail || auth.user;

    const mailOptions = {
      from: fromAddress,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Email Send Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
