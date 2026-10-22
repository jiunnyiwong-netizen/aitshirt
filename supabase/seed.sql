-- Placeholder shirts. Swap names, prices and mockups when the real photos arrive.
insert into products (slug, name, description, price_sen, colours, print_area, sort_order) values
(
  'classic-crew-tee', 'Classic Crew Tee',
  'Soft combed cotton, regular fit. Your photo printed on the front.',
  7900,
  '[{"key":"white","name":"White","hex":"#f4f4f1","mockup":"/mockups/white.png"},
    {"key":"black","name":"Black","hex":"#1c1c1c","mockup":"/mockups/black.png"},
    {"key":"navy","name":"Navy","hex":"#1f2a44","mockup":"/mockups/navy.png"}]',
  '{"mockup_width":1000,"mockup_height":1000,"x":350,"y":230,"width":300,"height":424}',
  1
),
(
  'oversized-tee', 'Oversized Tee',
  'Dropped shoulders and a relaxed boxy fit.',
  7900,
  '[{"key":"white","name":"White","hex":"#f4f4f1","mockup":"/mockups/white.png"},
    {"key":"black","name":"Black","hex":"#1c1c1c","mockup":"/mockups/black.png"},
    {"key":"navy","name":"Navy","hex":"#1f2a44","mockup":"/mockups/navy.png"}]',
  '{"mockup_width":1000,"mockup_height":1000,"x":350,"y":230,"width":300,"height":424}',
  2
),
(
  'heavyweight-tee', 'Heavyweight Tee',
  'Thick 240gsm cotton that keeps its shape.',
  7900,
  '[{"key":"white","name":"White","hex":"#f4f4f1","mockup":"/mockups/white.png"},
    {"key":"black","name":"Black","hex":"#1c1c1c","mockup":"/mockups/black.png"},
    {"key":"navy","name":"Navy","hex":"#1f2a44","mockup":"/mockups/navy.png"}]',
  '{"mockup_width":1000,"mockup_height":1000,"x":350,"y":230,"width":300,"height":424}',
  3
);
