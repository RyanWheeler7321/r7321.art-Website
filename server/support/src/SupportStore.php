<?php
declare(strict_types=1);

namespace R7321\Support;

final class SupportStore
{
    private const SUBMISSION_RETENTION_SECONDS = 90 * 86400;
    private const IP_BLOCK_SECONDS = 30 * 86400;

    private \PDO $db;

    public function __construct(string $databasePath, private readonly string $hashSecret)
    {
        $directory = dirname($databasePath);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new \RuntimeException('Could not create support data directory.');
        }
        chmod($directory, 0700);

        $this->db = new \PDO('sqlite:' . $databasePath, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);
        $this->db->exec('PRAGMA journal_mode = WAL');
        $this->db->exec('PRAGMA synchronous = NORMAL');
        $this->db->exec('PRAGMA busy_timeout = 5000');
        $this->createSchema();
        chmod($databasePath, 0600);
    }

    public function hash(string $scope, string $value): string
    {
        return hash_hmac('sha256', $scope . "\0" . $value, $this->hashSecret);
    }

    /** @return array<string, mixed>|null */
    public function getIdempotency(string $keyHash): ?array
    {
        $statement = $this->db->prepare('SELECT state, created_at, updated_at FROM idempotency WHERE key_hash = :key');
        $statement->execute([':key' => $keyHash]);
        $row = $statement->fetch();
        return $row === false ? null : $row;
    }

    /**
     * @param list<array{scope:string, hash:string}> $subjects
     * @return 'reserved'|'sent'
     */
    public function reserve(string $keyHash, array $subjects, int $now): string
    {
        $transactionStarted = false;
        try {
            $this->db->exec('BEGIN IMMEDIATE TRANSACTION');
            $transactionStarted = true;
            $this->purge($now);

            $state = $this->getIdempotencyForUpdate($keyHash);
            if (($state['state'] ?? '') === 'sent') {
                $this->db->exec('COMMIT');
                $transactionStarted = false;
                return 'sent';
            }
            if (($state['state'] ?? '') === 'processing' && $now - (int)$state['updated_at'] < 120) {
                $retryAfter = max(1, 120 - ($now - (int)$state['updated_at']));
                throw new SupportException('already_processing', 'This message is already being sent.', 409, $retryAfter);
            }

            foreach ($subjects as $subject) {
                $this->checkLimits($subject['scope'], $subject['hash'], $keyHash, $now);
            }
            foreach ($subjects as $subject) {
                $insert = $this->db->prepare(
                    'INSERT OR IGNORE INTO rate_events(scope, subject_hash, attempt_hash, occurred_at) '
                    . 'VALUES(:scope, :subject, :attempt, :occurred)'
                );
                $insert->execute([
                    ':scope' => $subject['scope'],
                    ':subject' => $subject['hash'],
                    ':attempt' => $keyHash,
                    ':occurred' => $now,
                ]);
            }

            $upsert = $this->db->prepare(
                'INSERT INTO idempotency(key_hash, state, created_at, updated_at) '
                . "VALUES(:key, 'processing', :now, :now) "
                . "ON CONFLICT(key_hash) DO UPDATE SET state = 'processing', updated_at = excluded.updated_at"
            );
            $upsert->execute([':key' => $keyHash, ':now' => $now]);
            $this->db->exec('COMMIT');
            $transactionStarted = false;
            return 'reserved';
        } catch (\Throwable $error) {
            if ($transactionStarted) {
                try {
                    $this->db->exec('ROLLBACK');
                } catch (\Throwable $ignored) {
                    // Preserve the original transaction failure.
                }
            }
            throw $error;
        }
    }

    public function markSent(string $keyHash, int $now): void
    {
        $statement = $this->db->prepare("UPDATE idempotency SET state = 'sent', updated_at = :now WHERE key_hash = :key");
        $statement->execute([':key' => $keyHash, ':now' => $now]);
    }

    public function markFailed(string $keyHash, int $now): void
    {
        $statement = $this->db->prepare(
            "UPDATE idempotency SET state = 'failed', updated_at = :now WHERE key_hash = :key AND state = 'processing'"
        );
        $statement->execute([':key' => $keyHash, ':now' => $now]);
    }

    /** @param list<array{scope:string, hash:string}> $subjects */
    public function rememberSubmission(string $messageId, string $category, array $subjects, string $agentHash, int $now): void
    {
        $fingerprints = ['browser' => '', 'ip' => '', 'email' => ''];
        foreach ($subjects as $subject) {
            if (array_key_exists($subject['scope'], $fingerprints)) {
                $fingerprints[$subject['scope']] = $subject['hash'];
            }
        }
        $statement = $this->db->prepare(
            'INSERT INTO submissions('
            . 'message_id, category, browser_hash, ip_hash, email_hash, agent_hash, state, created_at, updated_at'
            . ") VALUES(:message, :category, :browser, :ip, :email, :agent, 'processing', :now, :now) "
            . 'ON CONFLICT(message_id) DO UPDATE SET '
            . 'category = excluded.category, browser_hash = excluded.browser_hash, ip_hash = excluded.ip_hash, '
            . 'email_hash = excluded.email_hash, agent_hash = excluded.agent_hash, '
            . "state = 'processing', updated_at = excluded.updated_at"
        );
        $statement->execute([
            ':message' => $messageId,
            ':category' => $category,
            ':browser' => $fingerprints['browser'],
            ':ip' => $fingerprints['ip'],
            ':email' => $fingerprints['email'],
            ':agent' => $agentHash,
            ':now' => $now,
        ]);
    }

    public function markSubmissionSent(string $messageId, int $now): void
    {
        $statement = $this->db->prepare("UPDATE submissions SET state = 'sent', updated_at = :now WHERE message_id = :message");
        $statement->execute([':message' => $messageId, ':now' => $now]);
    }

    public function markSubmissionFailed(string $messageId, int $now): void
    {
        $statement = $this->db->prepare(
            "UPDATE submissions SET state = 'failed', updated_at = :now WHERE message_id = :message AND state = 'processing'"
        );
        $statement->execute([':message' => $messageId, ':now' => $now]);
    }

    /**
     * @param list<array{scope:string, hash:string}> $subjects
     * @return array{scope:string,source_message_id:string}|null
     */
    public function matchShadowBlock(array $subjects, int $now): ?array
    {
        $this->purgeExpiredBlocks($now);
        $find = $this->db->prepare(
            'SELECT scope, source_message_id FROM blocked_subjects '
            . 'WHERE scope = :scope AND subject_hash = :hash AND (expires_at IS NULL OR expires_at > :now) LIMIT 1'
        );
        foreach ($subjects as $subject) {
            $find->execute([':scope' => $subject['scope'], ':hash' => $subject['hash'], ':now' => $now]);
            $match = $find->fetch();
            if ($match === false) continue;
            $hit = $this->db->prepare(
                'UPDATE blocked_subjects SET hit_count = hit_count + 1, last_hit_at = :now '
                . 'WHERE scope = :scope AND subject_hash = :hash'
            );
            $hit->execute([':now' => $now, ':scope' => $subject['scope'], ':hash' => $subject['hash']]);
            return ['scope' => (string)$match['scope'], 'source_message_id' => (string)$match['source_message_id']];
        }
        return null;
    }

    /** @return array{message_id:string,scopes:list<string>,ip_expires_at:int|null} */
    public function blockMessage(string $messageId, string $reason, int $now): array
    {
        $messageId = strtoupper(trim($messageId));
        if (!preg_match('/^R7-[A-F0-9]{12}$/', $messageId)) {
            throw new \InvalidArgumentException('Invalid message ID.');
        }
        $statement = $this->db->prepare(
            "SELECT browser_hash, ip_hash, email_hash FROM submissions WHERE message_id = :message AND state = 'sent'"
        );
        $statement->execute([':message' => $messageId]);
        $submission = $statement->fetch();
        if ($submission === false) throw new \RuntimeException('Sent message ID was not found.');

        $reason = trim($reason);
        if (strlen($reason) > 200) $reason = substr($reason, 0, 200);
        $scopes = [];
        $ipExpiresAt = null;
        foreach (['browser', 'email', 'ip'] as $scope) {
            $hash = (string)($submission[$scope . '_hash'] ?? '');
            if ($hash === '') continue;
            $expiresAt = $scope === 'ip' ? $now + self::IP_BLOCK_SECONDS : null;
            $insert = $this->db->prepare(
                'INSERT INTO blocked_subjects('
                . 'scope, subject_hash, source_message_id, reason, created_at, expires_at, hit_count, last_hit_at'
                . ') VALUES(:scope, :hash, :source, :reason, :created, :expires, 0, NULL) '
                . 'ON CONFLICT(scope, subject_hash) DO UPDATE SET '
                . 'source_message_id = excluded.source_message_id, reason = excluded.reason, '
                . 'created_at = excluded.created_at, expires_at = excluded.expires_at'
            );
            $insert->execute([
                ':scope' => $scope,
                ':hash' => $hash,
                ':source' => $messageId,
                ':reason' => $reason,
                ':created' => $now,
                ':expires' => $expiresAt,
            ]);
            $scopes[] = $scope;
            if ($scope === 'ip') $ipExpiresAt = $expiresAt;
        }
        if ($scopes === []) throw new \RuntimeException('Message has no blockable sender fingerprints.');
        return ['message_id' => $messageId, 'scopes' => $scopes, 'ip_expires_at' => $ipExpiresAt];
    }

    public function unblockMessage(string $messageId): int
    {
        $messageId = strtoupper(trim($messageId));
        if (!preg_match('/^R7-[A-F0-9]{12}$/', $messageId)) {
            throw new \InvalidArgumentException('Invalid message ID.');
        }
        $statement = $this->db->prepare('DELETE FROM blocked_subjects WHERE source_message_id = :message');
        $statement->execute([':message' => $messageId]);
        return $statement->rowCount();
    }

    /** @return array<string, mixed>|null */
    private function getIdempotencyForUpdate(string $keyHash): ?array
    {
        $statement = $this->db->prepare('SELECT state, created_at, updated_at FROM idempotency WHERE key_hash = :key');
        $statement->execute([':key' => $keyHash]);
        $row = $statement->fetch();
        return $row === false ? null : $row;
    }

    private function checkLimits(string $scope, string $subjectHash, string $attemptHash, int $now): void
    {
        $existing = $this->db->prepare(
            'SELECT 1 FROM rate_events WHERE scope = :scope AND subject_hash = :subject AND attempt_hash = :attempt LIMIT 1'
        );
        $existing->execute([':scope' => $scope, ':subject' => $subjectHash, ':attempt' => $attemptHash]);
        if ($existing->fetchColumn() !== false) return;

        $limits = match ($scope) {
            'browser', 'email' => [[3, 60], [10, 600]],
            'ip' => [[30, 600]],
            default => [],
        };

        foreach ($limits as [$limit, $window]) {
            $cutoff = $now - $window;
            $statement = $this->db->prepare(
                'SELECT COUNT(*) AS total, MIN(occurred_at) AS oldest FROM rate_events '
                . 'WHERE scope = :scope AND subject_hash = :subject AND occurred_at > :cutoff'
            );
            $statement->execute([':scope' => $scope, ':subject' => $subjectHash, ':cutoff' => $cutoff]);
            $row = $statement->fetch() ?: ['total' => 0, 'oldest' => $now];
            if ((int)$row['total'] >= $limit) {
                $retryAfter = max(1, (int)$row['oldest'] + $window - $now + 1);
                throw new SupportException(
                    'rate_limited',
                    'You have sent several messages recently. Please wait a moment and try again.',
                    429,
                    $retryAfter
                );
            }
        }
    }

    private function purge(int $now): void
    {
        $rate = $this->db->prepare('DELETE FROM rate_events WHERE occurred_at < :cutoff');
        $rate->execute([':cutoff' => $now - 86400]);
        $idempotency = $this->db->prepare('DELETE FROM idempotency WHERE updated_at < :cutoff');
        $idempotency->execute([':cutoff' => $now - 604800]);
        $submissions = $this->db->prepare('DELETE FROM submissions WHERE updated_at < :cutoff');
        $submissions->execute([':cutoff' => $now - self::SUBMISSION_RETENTION_SECONDS]);
        $this->purgeExpiredBlocks($now);
    }

    private function purgeExpiredBlocks(int $now): void
    {
        $statement = $this->db->prepare('DELETE FROM blocked_subjects WHERE expires_at IS NOT NULL AND expires_at <= :now');
        $statement->execute([':now' => $now]);
    }

    private function createSchema(): void
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS rate_events ('
            . 'scope TEXT NOT NULL, subject_hash TEXT NOT NULL, attempt_hash TEXT NOT NULL, occurred_at INTEGER NOT NULL, '
            . 'UNIQUE(scope, subject_hash, attempt_hash))'
        );
        $this->db->exec(
            'CREATE INDEX IF NOT EXISTS rate_events_lookup '
            . 'ON rate_events(scope, subject_hash, occurred_at)'
        );
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS idempotency ('
            . 'key_hash TEXT PRIMARY KEY, state TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)'
        );
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS submissions ('
            . 'message_id TEXT PRIMARY KEY, category TEXT NOT NULL, browser_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, '
            . 'email_hash TEXT NOT NULL, agent_hash TEXT NOT NULL, state TEXT NOT NULL, '
            . 'created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)'
        );
        $this->db->exec(
            'CREATE INDEX IF NOT EXISTS submissions_updated ON submissions(updated_at)'
        );
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS blocked_subjects ('
            . 'scope TEXT NOT NULL, subject_hash TEXT NOT NULL, source_message_id TEXT NOT NULL, reason TEXT NOT NULL, '
            . 'created_at INTEGER NOT NULL, expires_at INTEGER NULL, hit_count INTEGER NOT NULL DEFAULT 0, last_hit_at INTEGER NULL, '
            . 'PRIMARY KEY(scope, subject_hash))'
        );
        $this->db->exec(
            'CREATE INDEX IF NOT EXISTS blocked_subjects_source ON blocked_subjects(source_message_id)'
        );
    }
}
