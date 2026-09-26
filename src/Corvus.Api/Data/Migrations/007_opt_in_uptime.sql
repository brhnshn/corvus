-- Migration: 007_opt_in_uptime.sql
-- Description: Adds is_uptime_enabled flag and heals existing locked status for unmonitored docker services.

-- 1. services tablosuna opt-in kontrol bayrağı ekle
ALTER TABLE services ADD COLUMN is_uptime_enabled INTEGER NOT NULL DEFAULT 0;

-- 2. service_overrides tablosuna kullanıcı tercih bayrağı ekle
ALTER TABLE service_overrides ADD COLUMN is_uptime_enabled INTEGER;

-- 3. Performans için indeks oluştur
CREATE INDEX IF NOT EXISTS idx_services_is_uptime_enabled ON services(is_uptime_enabled);

-- 4. Geriye dönük uyumluluk: Manuel olarak eklenmiş olan servisler doğrudan Uptime takibindedir
UPDATE services SET is_uptime_enabled = 1 WHERE source = 'manual';

-- 5. Kendi Kendini İyileştirme (Self-Healing) Adımı:
-- Hali hazırda 'down' veya 'degraded' olarak kilitlenmiş Docker servislerinin durumunu 'unknown' yap.
-- ContainerDiscoveryService ilk döngüsünde (10sn içinde) Docker daemon'ın gerçek durumuna ('healthy'/'down') eşitleyecektir.
UPDATE services 
SET status = 'unknown' 
WHERE source = 'docker' AND is_uptime_enabled = 0;
