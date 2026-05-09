import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let payload: { name?: string; email?: string; subject?: string; message?: string };

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      payload = {
        name: form.get("name")?.toString(),
        email: form.get("email")?.toString(),
        subject: form.get("subject")?.toString(),
        message: form.get("message")?.toString()
      };
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const subject = payload.subject?.trim();
  const message = payload.message?.trim();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  // TODO: forward to email service / Slack / DB. For now we log so dev can see submissions.
  console.log("[contact]", { name, email, subject, message });

  return NextResponse.json({ ok: true });
}
