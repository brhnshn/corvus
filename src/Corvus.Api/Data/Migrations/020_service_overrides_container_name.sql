-- 020_service_overrides_container_name.sql
-- Kullanıcı ayarının bağlı olduğu Docker konteyner adı. Konteyner yeniden oluşturulunca (yeni ID)
-- ayarlar bu adla yeni konteynere geri bağlanır.
ALTER TABLE service_overrides ADD COLUMN container_name TEXT;
