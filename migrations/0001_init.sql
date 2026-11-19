-- 0001_init.sql — skema awal (lihat docs/DATABASE.md)

CREATE TABLE tenants (
  id                    TEXT PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE
                          CHECK (length(slug) BETWEEN 3 AND 40
                                 AND slug NOT GLOB '*[^a-z0-9-]*'
                                 AND slug NOT LIKE '-%' AND slug NOT LIKE '%-'),
  business_name         TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('kuliner','fashion','jasa','cantik','toko','kriya','lainnya')),
  template_id           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','suspended','deleted')),
  payment_status        TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  allow_template_switch INTEGER NOT NULL DEFAULT 1,
  show_branding         INTEGER NOT NULL DEFAULT 1,
  media_quota_bytes     INTEGER NOT NULL DEFAULT 15728640,
  media_used_bytes      INTEGER NOT NULL DEFAULT 0,
  publish_count_day     INTEGER NOT NULL DEFAULT 0,
  publish_count_date    TEXT,
  notes                 TEXT,
  hosting_until         INTEGER,
  published_at          INTEGER,
  deleted_at            INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_hosting ON tenants(hosting_until);

CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  username         TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(username) BETWEEN 3 AND 32),
  role             TEXT NOT NULL CHECK (role IN ('admin','owner')),
  pw_hash          TEXT NOT NULL,
  pw_salt          TEXT NOT NULL,
  pw_iter          INTEGER NOT NULL,
  must_change_pw   INTEGER NOT NULL DEFAULT 1,
  failed_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until     INTEGER,
  last_login_at    INTEGER,
  disabled         INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  CHECK ((role = 'admin' AND tenant_id IS NULL) OR (role = 'owner' AND tenant_id IS NOT NULL))
);
CREATE INDEX idx_users_tenant ON users(tenant_id);

CREATE TABLE sessions (
  id_hash     TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  ip          TEXT,
  user_agent  TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE site_content (
  tenant_id         TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  draft_json        TEXT NOT NULL,
  published_json    TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  draft_updated_at  INTEGER NOT NULL,
  draft_updated_by  TEXT
);

CREATE TABLE hostnames (
  hostname        TEXT PRIMARY KEY COLLATE NOCASE,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('subdomain','custom')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','failed')),
  cf_hostname_id  TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_hostnames_tenant ON hostnames(tenant_id);

CREATE TABLE media (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL UNIQUE,
  mime        TEXT NOT NULL CHECK (mime IN ('image/webp','image/jpeg','image/png')),
  bytes       INTEGER NOT NULL,
  width       INTEGER,
  height      INTEGER,
  alt         TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_media_tenant ON media(tenant_id, created_at DESC);

CREATE TABLE payments (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('setup','hosting','maintenance','addon')),
  amount_idr   INTEGER NOT NULL CHECK (amount_idr >= 0),
  paid_at      INTEGER NOT NULL,
  period_start INTEGER,
  period_end   INTEGER,
  method       TEXT,
  note         TEXT,
  recorded_by  TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_payments_tenant ON payments(tenant_id, paid_at DESC);

CREATE TABLE maintenance_requests (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','quoted','in_progress','done','cancelled')),
  fee_idr      INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX idx_maint_tenant ON maintenance_requests(tenant_id, status);

CREATE TABLE audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id  TEXT,
  tenant_id      TEXT,
  action         TEXT NOT NULL,
  detail_json    TEXT,
  ip             TEXT,
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_created ON audit_log(created_at);

CREATE TABLE job_state (
  job         TEXT PRIMARY KEY,
  cursor      TEXT,
  run_id      TEXT,
  updated_at  INTEGER NOT NULL
);
