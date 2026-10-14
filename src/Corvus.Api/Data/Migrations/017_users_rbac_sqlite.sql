-- Migration: 017_users_rbac_sqlite.sql
-- Description: SQLite index for role column and RBAC support (admin, operator, viewer)

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
