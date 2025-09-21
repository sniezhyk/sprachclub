USE sprachclubdb;

-- Feste Levels (nur diese 4)
INSERT IGNORE INTO levels (code, label) VALUES
  ('A2.1',  'A2.1 – Elementarstufe 1'),
  ('A2.2',  'A2.2 – Elementarstufe 2'),
  ('A2/B1', 'A2/B1 – Übergang'),
  ('B2/C1', 'B2/C1 – Fortgeschritten/Übergang');