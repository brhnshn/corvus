-- Migration: 013_service_tags.sql
-- Description: Adds tags column for environment and category grouping to services and service_overrides tables

ALTER TABLE services ADD COLUMN tags TEXT DEFAULT '';
ALTER TABLE service_overrides ADD COLUMN tags TEXT DEFAULT '';
