import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { host, port, secure, auth } = body;

    if (!host || !port || !auth || !auth.user || !auth.pass) {
      return NextResponse.json(
        { success: false, error: 'Missing required SMTP configuration fields.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: secure === true || secure === 'true',
      auth: {
        user: auth.user,
        pass: auth.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    await transporter.verify();

    return NextResponse.json({ success: true, message: 'SMTP connection verified successfully!' });
  } catch (error: any) {
    console.error('SMTP Verification Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'SMTP Connection Verification Failed' },
      { status: 500 }
    );
  }
}
