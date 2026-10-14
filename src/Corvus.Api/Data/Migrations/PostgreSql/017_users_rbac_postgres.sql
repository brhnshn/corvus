-- Migration: 017_users_rbac_postgres.sql
-- Description: Production PostgreSQL schema for Users RBAC (admin, operator, viewer)

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
