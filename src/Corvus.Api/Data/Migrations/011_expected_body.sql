-- 011_expected_body.sql — HTTP response body keyword / regex validation

ALTER TABLE services ADD COLUMN expected_body TEXT;
ALTER TABLE service_overrides ADD COLUMN expected_body TEXT;
