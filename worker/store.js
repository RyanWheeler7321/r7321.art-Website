import { SupportError } from "./errors.js";

const SUBMISSION_RETENTION_SECONDS = 90 * 86400;

const LIMITS = {
  browser: [[3, 60], [10, 600]],
  email: [[3, 60], [10, 600]],
  ip: [[30, 600]],
};

export class SupportStore {
  constructor(db) {
    this.db = db;
  }

  async getIdempotency(keyHash) {
    return this.db.prepare("SELECT state, updated_at FROM idempotency WHERE key_hash = ?").bind(keyHash).first();
  }

  async reserve(keyHash, subjects, now) {
    await this.purge(now);
    const state = await this.getIdempotency(keyHash);
    if (state?.state === "sent") return "sent";
    if (state?.state === "processing" && now - state.updated_at < 120) {
      throw new SupportError("already_processing", "This message is already being sent.", 409, Math.max(1, 120 - (now - state.updated_at)));
    }

    for (const subject of subjects) await this.checkLimits(subject, keyHash, now);

    // Only one request can claim a key, a racing duplicate changes nothing
    const writes = [this.db
      .prepare("INSERT INTO idempotency(key_hash, state, created_at, updated_at) VALUES(?, 'processing', ?, ?) "
        + "ON CONFLICT(key_hash) DO UPDATE SET state = 'processing', updated_at = excluded.updated_at "
        + "WHERE idempotency.state = 'failed' OR (idempotency.state = 'processing' AND idempotency.updated_at <= ?)")
      .bind(keyHash, now, now, now - 120)];
    for (const subject of subjects) {
      writes.push(this.db
        .prepare("INSERT OR IGNORE INTO rate_events(scope, subject_hash, attempt_hash, occurred_at) VALUES(?, ?, ?, ?)")
        .bind(subject.scope, subject.hash, keyHash, now));
    }
    const [claim] = await this.db.batch(writes);
    if (claim.meta.changes === 0) {
      if ((await this.getIdempotency(keyHash))?.state === "sent") return "sent";
      throw new SupportError("already_processing", "This message is already being sent.", 409, 120);
    }
    return "reserved";
  }

  async markSent(keyHash, messageId, now) {
    const writes = [this.db.prepare("UPDATE idempotency SET state = 'sent', updated_at = ? WHERE key_hash = ?").bind(now, keyHash)];
    if (messageId) {
      writes.push(this.db.prepare("UPDATE submissions SET state = 'sent', updated_at = ? WHERE message_id = ?").bind(now, messageId));
    }
    await this.db.batch(writes);
  }

  async markFailed(keyHash, messageId, now) {
    const writes = [this.db
      .prepare("UPDATE idempotency SET state = 'failed', updated_at = ? WHERE key_hash = ? AND state = 'processing'")
      .bind(now, keyHash)];
    if (messageId) {
      writes.push(this.db
        .prepare("UPDATE submissions SET state = 'failed', updated_at = ? WHERE message_id = ? AND state = 'processing'")
        .bind(now, messageId));
    }
    await this.db.batch(writes);
  }

  async rememberSubmission(messageId, category, subjects, agentHash, now) {
    const hashes = { browser: "", ip: "", email: "" };
    for (const subject of subjects) hashes[subject.scope] = subject.hash;
    await this.db
      .prepare("INSERT INTO submissions(message_id, category, browser_hash, ip_hash, email_hash, agent_hash, state, created_at, updated_at) "
        + "VALUES(?, ?, ?, ?, ?, ?, 'processing', ?, ?) "
        + "ON CONFLICT(message_id) DO UPDATE SET category = excluded.category, browser_hash = excluded.browser_hash, "
        + "ip_hash = excluded.ip_hash, email_hash = excluded.email_hash, agent_hash = excluded.agent_hash, "
        + "state = 'processing', updated_at = excluded.updated_at")
      .bind(messageId, category, hashes.browser, hashes.ip, hashes.email, agentHash, now, now)
      .run();
  }

  async matchShadowBlock(subjects, now) {
    for (const subject of subjects) {
      const match = await this.db
        .prepare("SELECT scope, source_message_id FROM blocked_subjects "
          + "WHERE scope = ? AND subject_hash = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1")
        .bind(subject.scope, subject.hash, now)
        .first();
      if (!match) continue;
      await this.db
        .prepare("UPDATE blocked_subjects SET hit_count = hit_count + 1, last_hit_at = ? WHERE scope = ? AND subject_hash = ?")
        .bind(now, subject.scope, subject.hash)
        .run();
      return match;
    }
    return null;
  }

  async checkLimits(subject, attemptHash, now) {
    const existing = await this.db
      .prepare("SELECT 1 FROM rate_events WHERE scope = ? AND subject_hash = ? AND attempt_hash = ? LIMIT 1")
      .bind(subject.scope, subject.hash, attemptHash)
      .first();
    if (existing) return;

    for (const [limit, window] of LIMITS[subject.scope] || []) {
      const row = await this.db
        .prepare("SELECT COUNT(*) AS total, MIN(occurred_at) AS oldest FROM rate_events WHERE scope = ? AND subject_hash = ? AND occurred_at > ?")
        .bind(subject.scope, subject.hash, now - window)
        .first();
      if ((row?.total || 0) >= limit) {
        throw new SupportError(
          "rate_limited",
          "You have sent several messages recently. Please wait a moment and try again.",
          429,
          Math.max(1, row.oldest + window - now + 1),
        );
      }
    }
  }

  async purge(now) {
    await this.db.batch([
      this.db.prepare("DELETE FROM rate_events WHERE occurred_at < ?").bind(now - 86400),
      this.db.prepare("DELETE FROM idempotency WHERE updated_at < ?").bind(now - 604800),
      this.db.prepare("DELETE FROM submissions WHERE updated_at < ?").bind(now - SUBMISSION_RETENTION_SECONDS),
      this.db.prepare("DELETE FROM blocked_subjects WHERE expires_at IS NOT NULL AND expires_at <= ?").bind(now),
    ]);
  }
}
