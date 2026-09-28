import { Buffer } from "node:buffer";
import { EmailMessage } from "cloudflare:email";
import { SupportError } from "./errors.js";

export async function sendSupportMail(env, submission, images) {
  const raw = buildMessage(env, submission, images);
  try {
    await env.MAIL.send(new EmailMessage(env.MAIL_FROM, env.NOTIFY_TO, raw));
  } catch (error) {
    console.error(JSON.stringify({ event: "mail_failed", error: String(error?.message || error) }));
    throw new SupportError("mail_unavailable", "The message service is unavailable. Please try again.", 503);
  }
}

function buildMessage(env, submission, images) {
  const boundary = `r7-${crypto.randomUUID()}`;
  const type = submission.category === "bug" ? "Bug" : "Feedback";
  const subject = submission.category === "bug" ? "r7321.art Bug Report" : "r7321.art Feedback";
  const body = [
    `${type} submitted through r7321.art`,
    `Message ID: ${submission.messageId}`,
    "",
    `Name: ${submission.name || "Anonymous"}`,
    `Email: ${submission.email || "No reply address"}`,
    `Images: ${images.length}`,
    "",
    submission.message,
  ].join("\r\n");

  const headers = [
    `From: r7321 Support <${env.MAIL_FROM}>`,
    `To: <${env.NOTIFY_TO}>`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${submission.messageId}.${Date.now()}@r7321.art>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  if (submission.email) {
    headers.push(`Reply-To: ${encodeWord(submission.name || submission.email)} <${submission.email}>`);
  }

  const parts = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(new TextEncoder().encode(body)),
  ];
  for (const image of images) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${image.mime}; name="${image.name}"`,
      `Content-Disposition: attachment; filename="${image.name}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(image.bytes),
    );
  }
  parts.push(`--${boundary}--`, "");
  return parts.join("\r\n");
}

function encodeWord(text) {
  const clean = text.replace(/[\r\n"\\]/g, "");
  if (/^[\x20-\x7e]*$/.test(clean)) return `"${clean}"`;
  return `=?utf-8?B?${toBase64(new TextEncoder().encode(clean))}?=`;
}

// Long base64 lines (under the 998 line limit, not MIME's 76) to save CPU time
function wrapBase64(bytes) {
  const encoded = toBase64(bytes);
  const lines = [];
  for (let i = 0; i < encoded.length; i += 996) lines.push(encoded.slice(i, i + 996));
  return lines.join("\r\n");
}

function toBase64(bytes) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}
