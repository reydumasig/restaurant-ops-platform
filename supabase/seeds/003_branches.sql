-- Real Casa Inasal locations. Binmaley has a commissary area on-site in
-- addition to its retail floor, so it gets two location records (commissary
-- + branch) — see conversation notes for why.

insert into branches (code, name, type) values
  ('BINM-COM', 'Casa Inasal - Binmaley Commissary', 'commissary'),
  ('BINM', 'Casa Inasal - Binmaley', 'branch'),
  ('STAB', 'Casa Inasal - Sta Barbara', 'branch'),
  ('MANG', 'Casa Inasal - Mangaldan', 'branch'),
  ('CALA', 'Casa Inasal - Calasiao', 'branch')
on conflict (code) do nothing;
