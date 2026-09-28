import { SupportError } from "./errors.js";
import { cleanImages, MAX_TOTAL_BYTES } from "./images.js";
import { sendSupportMail } from "./mail.js";
import { SupportStore } from "./store.js";

const COOKIE_NAME = "__Host-r7_support";
const TOKEN_MIN_AGE = 3;
const TOKEN_MAX_AGE = 7200;
const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export async function handleSupport(request, env) {
  const cookies = [];
  try {
    const url = new URL(request.url);
    if (request.method === "GET" && url.searchParams.get("action") === "init") {
      let browserId = readBrowserId(request);
      if (!browserId) {
        browserId = randomHex(32);
        cookies.push(`${COOKIE_NAME}=${browserId}; Max-Age=31536000; Path=/; Secure; HttpOnly; SameSite=Lax`);
      }
      return json(200, {
        ok: true,
        formToken: await issueToken(env.APP_SECRET, browserId),
        turnstileSiteKey: env.TURNSTILE_SITE_KEY,
      }, cookies);
    }
    if (request.method !== "POST") {
      return json(405, { ok: false, code: "method_not_allowed", message: "Method not allowed." }, [], 0, { Allow: "GET, POST" });
    }

    if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
      throw new SupportError("origin_invalid", "Please use the support page to send your message.", 403);
    }
    // Room for the form fields on top of the image limit.
    if (Number(request.headers.get("Content-Length") || 0) > MAX_TOTAL_BYTES + 2 * 1024 * 1024) {
      throw new SupportError("request_too_large", "The selected images are larger than 16 MB combined.", 413);
    }
    const browserId = readBrowserId(request);
    if (!browserId) throw new SupportError("browser_session_missing", "Please refresh the page and try again.", 403);

    let form;
    try {
      form = await request.formData();
    } catch {
      throw new SupportError("form_invalid", "Please refresh the page and try again.", 400);
    }
    const result = await submit(env, request, form, browserId);
    return json(200, result);
  } catch (error) {
    if (error instanceof SupportError) {
      return json(error.status, { ok: false, code: error.code, message: error.message, retryAfter: error.retryAfter }, cookies, error.retryAfter);
    }
    console.error(JSON.stringify({ event: "controller_error", error: String(error?.stack || error) }));
    return json(500, { ok: false, code: "internal_error", message: "The message service is unavailable. Please try again." });
  }
}

async function submit(env, request, form, browserId) {
  const started = Date.now();
  const store = new SupportStore(env.DB);
  let keyHash = "";
  let messageId = "";
  let reserved = false;
  let submission = {};

  try {
    submission = validate(form);
    await verifyToken(env.APP_SECRET, submission.formToken, browserId);

    keyHash = await hash(env.APP_SECRET, "idempotency", submission.idempotencyKey);
    if ((await store.getIdempotency(keyHash))?.state === "sent") {
      log("duplicate_success", { category: submission.category, elapsed_ms: Date.now() - started });
      return { ok: true, duplicate: true };
    }

    const remoteAddress = request.headers.get("CF-Connecting-IP") || "unknown";
    await verifyTurnstile(env, submission.turnstileToken, remoteAddress);

    const subjects = [
      { scope: "browser", hash: await hash(env.APP_SECRET, "browser", browserId) },
      { scope: "ip", hash: await hash(env.APP_SECRET, "ip", remoteAddress) },
    ];
    if (submission.email) subjects.push({ scope: "email", hash: await hash(env.APP_SECRET, "email", submission.email) });

    const now = () => Math.floor(Date.now() / 1000);
    if (await store.reserve(keyHash, subjects, now()) === "sent") return { ok: true, duplicate: true };
    reserved = true;

    const blocked = await store.matchShadowBlock(subjects, now());
    if (blocked) {
      await store.markSent(keyHash, "", now());
      log("shadowblocked", { category: submission.category, matched_scope: blocked.scope, elapsed_ms: Date.now() - started });
      return { ok: true, duplicate: false };
    }

    messageId = `R7-${keyHash.slice(0, 12).toUpperCase()}`;
    submission.messageId = messageId;
    const agentHash = await hash(env.APP_SECRET, "agent", request.headers.get("User-Agent") || "unknown");
    await store.rememberSubmission(messageId, submission.category, subjects, agentHash, now());

    const images = await cleanImages(form.getAll("images[]"));
    await sendSupportMail(env, submission, images);
    reserved = false;
    try {
      await store.markSent(keyHash, messageId, now());
    } catch (stateError) {
      log("accepted_state_failed", { category: submission.category, error: String(stateError?.message || stateError) });
    }

    log("sent", {
      message_id: messageId,
      category: submission.category,
      anonymous: !submission.email,
      images: images.length,
      image_bytes: images.reduce((total, image) => total + image.bytes.length, 0),
      elapsed_ms: Date.now() - started,
    });
    return { ok: true, duplicate: false };
  } catch (error) {
    if (reserved && keyHash) {
      await store.markFailed(keyHash, messageId, Math.floor(Date.now() / 1000)).catch(() => {});
    }
    log("rejected", {
      category: submission.category || "unknown",
      error_code: error instanceof SupportError ? error.code : "internal_error",
      elapsed_ms: Date.now() - started,
    });
    throw error;
  }
}

function validate(form) {
  const field = (name) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  if (field("website").trim() !== "") {
    throw new SupportError("spam_rejected", "Your message could not be sent. Please try again.", 400);
  }

  const category = field("category").trim().toLowerCase();
  if (category !== "feedback" && category !== "bug") throw new SupportError("category_invalid", "Choose Feedback or Bug.", 400);

  const name = field("name").replace(/[\r\n\0]/g, "").trim();
  if ([...name].length > 100) throw new SupportError("name_too_long", "Name is too long.", 400);

  const email = field("email").replace(/[\r\n\0]/g, "").trim().toLowerCase();
  if (email.length > 254 || (email && !EMAIL_PATTERN.test(email))) {
    throw new SupportError("email_invalid", "Enter a valid email address or leave it blank.", 400);
  }

  const message = field("message").replace(/\0/g, "").trim();
  if (!message) throw new SupportError("message_required", "Write a message before sending.", 400);
  if ([...message].length > 12000) throw new SupportError("message_too_long", "Your message is longer than 12,000 characters.", 400);

  const idempotencyKey = field("idempotencyKey").trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) {
    throw new SupportError("idempotency_invalid", "Please refresh the page and try again.", 400);
  }

  return {
    category,
    name,
    email,
    message,
    formToken: field("formToken").trim(),
    turnstileToken: field("turnstileToken").trim(),
    idempotencyKey,
  };
}

async function verifyTurnstile(env, token, remoteAddress) {
  if (!token || token.length > 2048) throw new SupportError("turnstile_invalid", "Spam protection failed. Please try again.", 403);

  let result;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: remoteAddress,
        idempotency_key: crypto.randomUUID(),
      }),
    });
    if (!response.ok) throw new Error(`Siteverify HTTP ${response.status}`);
    result = await response.json();
  } catch (error) {
    console.error(JSON.stringify({ event: "turnstile_unavailable", error: String(error?.message || error) }));
    throw new SupportError("turnstile_unavailable", "Spam protection is unavailable. Please try again.", 503);
  }

  if (result.success !== true || result.hostname !== env.TURNSTILE_HOSTNAME || result.action !== env.TURNSTILE_ACTION) {
    throw new SupportError("turnstile_invalid", "Spam protection failed. Please try again.", 403);
  }
}

async function issueToken(secret, browserId) {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    v: 1,
    iat: Math.floor(Date.now() / 1000),
    nonce: randomHex(16),
    browser: browserId,
  })));
  return `${payload}.${base64Url(await hmac(secret, payload))}`;
}

async function verifyToken(secret, token, browserId) {
  const invalid = () => new SupportError("form_invalid", "Please refresh the page and try again.", 403);
  const [payload, signature, extra] = String(token).split(".");
  if (!payload || !signature || extra !== undefined) throw invalid();
  if (!timingSafeEqual(signature, base64Url(await hmac(secret, payload)))) throw invalid();

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  } catch {
    throw invalid();
  }
  if (data?.v !== 1 || typeof data.browser !== "string" || !timingSafeEqual(data.browser, browserId)) throw invalid();

  const now = Math.floor(Date.now() / 1000);
  const issuedAt = Number(data.iat) || 0;
  if (issuedAt <= 0 || now - issuedAt > TOKEN_MAX_AGE) {
    throw new SupportError("form_expired", "This form expired. Please try sending again.", 403);
  }
  if (issuedAt > now + 30 || now - issuedAt < TOKEN_MIN_AGE) {
    throw new SupportError("form_too_fast", "Please take a moment before sending your message.", 429, Math.max(1, TOKEN_MIN_AGE - (now - issuedAt)));
  }
}

async function hash(secret, scope, value) {
  return [...await hmac(secret, `${scope}\0${value}`)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}

function timingSafeEqual(a, b) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  return left.length === right.length && crypto.subtle.timingSafeEqual(left, right);
}

function readBrowserId(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)__Host-r7_support=([a-f0-9]{64})(?:;|$)/);
  return match ? match[1] : "";
}

function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function log(event, fields) {
  console.log(JSON.stringify({ event, ...fields }));
}

function json(status, payload, cookies = [], retryAfter = 0, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  if (retryAfter > 0) headers.set("Retry-After", String(retryAfter));
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(payload), { status, headers });
}
