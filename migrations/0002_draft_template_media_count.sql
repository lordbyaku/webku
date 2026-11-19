-- 0002: desain draf terpisah dari desain tayang + penghitung foto atomik.

-- Desain yang dipilih tetapi belum diterbitkan. NULL = sama dengan template_id.
ALTER TABLE tenants ADD COLUMN draft_template_id TEXT;

-- Jumlah file media per tenant (dicek & diubah dalam satu pernyataan UPDATE).
ALTER TABLE tenants ADD COLUMN media_count INTEGER NOT NULL DEFAULT 0;
UPDATE tenants SET media_count = (SELECT COUNT(*) FROM media WHERE media.tenant_id = tenants.id);

CREATE INDEX idx_tenants_deleted ON tenants(status, deleted_at);
