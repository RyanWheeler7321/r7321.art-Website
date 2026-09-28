CREATE TABLE IF NOT EXISTS rate_events (
  scope TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  attempt_hash TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  UNIQUE(scope, subject_hash, attempt_hash)
);
CREATE INDEX IF NOT EXISTS rate_events_lookup ON rate_events(scope, subject_hash, occurred_at);

CREATE TABLE IF NOT EXISTS idempotency (
  key_hash TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  message_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  browser_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  agent_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_updated ON submissions(updated_at);

CREATE TABLE IF NOT EXISTS blocked_subjects (
  scope TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  source_message_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at INTEGER NULL,
  PRIMARY KEY(scope, subject_hash)
);
CREATE INDEX IF NOT EXISTS blocked_subjects_source ON blocked_subjects(source_message_id);
