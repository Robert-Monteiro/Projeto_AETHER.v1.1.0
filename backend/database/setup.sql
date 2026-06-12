-- PostgreSQL schema for AETHER Asset Management System
-- Generated from current Express backend and system feature set.

BEGIN;

-- Users and authentication
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  department VARCHAR(100),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- Asset inventory
CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(150),
  model VARCHAR(150),
  serial_number VARCHAR(150),
  purchase_date DATE,
  warranty_expiry DATE,
  location VARCHAR(255),
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  cost NUMERIC(12,2),
  license_key TEXT,
  license_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);

-- Ticketing and support requests
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  asset_id BIGINT REFERENCES assets(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  ip VARCHAR(50),
  anydesk_code VARCHAR(100),
  hostname VARCHAR(255),
  serial_number VARCHAR(255),
  operating_system VARCHAR(255),
  processor VARCHAR(255),
  ram_memory VARCHAR(50),
  realvnc_id VARCHAR(255),
  rustdesk_id VARCHAR(255),
  resolution TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_asset_id ON tickets(asset_id);

-- Asset lifecycle history and audit trail
CREATE TABLE IF NOT EXISTS asset_history (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_details JSONB,
  changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_history_asset_id ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_changed_by ON asset_history(changed_by);

-- Agent installation requests and inventory agent events
CREATE TABLE IF NOT EXISTS install_requests (
  id BIGSERIAL PRIMARY KEY,
  machine_name VARCHAR(255) NOT NULL,
  machine_ip VARCHAR(50) NOT NULL,
  agent_version VARCHAR(100),
  requested_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  request_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_install_requests_status ON install_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_install_requests_requested_by ON install_requests(requested_by);

-- Compliance monitoring and audit records
CREATE TABLE IF NOT EXISTS compliance_checks (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  check_type VARCHAR(100) NOT NULL,
  result VARCHAR(100) NOT NULL,
  details JSONB,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_asset_id ON compliance_checks(asset_id);

-- Optional ticket comments for collaboration and history
CREATE TABLE IF NOT EXISTS ticket_comments (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_user_id ON ticket_comments(user_id);

-- Audit log for security and change tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(150) NOT NULL,
  entity VARCHAR(100),
  entity_id BIGINT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);

COMMIT;
