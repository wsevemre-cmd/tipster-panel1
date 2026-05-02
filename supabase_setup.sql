-- ============================================================
-- TIPSTER PANEL — Supabase Kurulum SQL
-- Supabase Dashboard > SQL Editor'de bir kez çalıştırın.
-- ============================================================

create table if not exists license_usage (
  code        text primary key,
  pass_hash   text not null,
  activated_at text not null,
  label       text,
  type        text
);

-- Hiçbir satır dışarıdan okunamasın (service_role key sadece fonksiyonlarda)
alter table license_usage enable row level security;

-- RLS: hiçbir public erişim yok (tüm işlemler service_role ile yapılır)
create policy "no public access" on license_usage
  for all using (false);
