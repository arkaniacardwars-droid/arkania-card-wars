-- =====================================================================
--  Arkania Card Wars — SEED do catálogo (15 cartas atuais)
--  Stats derivados da função seed()+normalizar() de js/cards.js.
--  Idempotente: on conflict do update mantém o catálogo em sincronia.
--
--  ⚠️ Fonte única da verdade = js/cards.js. Ao mudar o catálogo lá, gere
--     este seed de novo (posso escrever um script Node que faz isso quando
--     o toolchain existir), em vez de editar à mão.
-- =====================================================================

insert into public.cards (id, base, nome, variante, raridade, tipo, dom, emoji, arte, stats) values
  ('skeleton-red',    'skeleton',        'Skeleton Red',        'Padrão',   'comum',    'HERO', 'FOR', '💀', 'skeleton-red.webp',    '{"ATA":80,"DEF":65,"FOR":76,"VEL":71,"ENE":52,"VID":68}'),
  ('nagoy',           'nagoy',           'Nagoy',               'Padrão',   'comum',    'HERO', 'FOR', '👤', 'nagoy.webp',           '{"ATA":80,"DEF":65,"FOR":80,"VEL":65,"ENE":52,"VID":68}'),
  ('dragao-de-fogo',  'dragao',          'Dragão de Fogo',      'Fogo',     'epico',    'HERO', 'FOR', '🐉', 'dragao-de-fogo.webp',  '{"ATA":95,"DEF":65,"FOR":88,"VEL":71,"ENE":52,"VID":68}'),
  ('urso-cyborg',     'urso',            'Urso Cyborg',         'Padrão',   'epico',    'HERO', 'FOR', '🐻', 'urso-cyborg.webp',     '{"ATA":95,"DEF":77,"FOR":88,"VEL":59,"ENE":52,"VID":76}'),
  ('fox',             'fox',             'Fox Cyborg',          'Padrão',   'incomum',  'HERO', 'VEL', '🦊', 'fox.webp',             '{"ATA":70,"DEF":59,"FOR":58,"VEL":85,"ENE":58,"VID":64}'),
  ('skeleton-red-1',  'skeleton',        'Esqueleto Ceifador',  'Ceifador', 'incomum',  'HERO', 'VEL', '☠️', 'skeleton-red-1.webp',  '{"ATA":76,"DEF":59,"FOR":64,"VEL":85,"ENE":52,"VID":64}'),
  ('taichin',         'taichin',         'Taichin',             'Padrão',   'raro',     'HERO', 'VEL', '🥋', 'taichin.webp',         '{"ATA":70,"DEF":53,"FOR":58,"VEL":90,"ENE":64,"VID":60}'),
  ('kassandra',       'kassandra',       'Kassandra',           'Padrão',   'epico',    'HERO', 'VEL', '⚔️', 'kassandra.webp',       '{"ATA":76,"DEF":59,"FOR":64,"VEL":95,"ENE":58,"VID":64}'),
  ('lincon-cartola',  'lincon',          'Lincon Cartola',      'Padrão',   'incomum',  'SUPP', 'INT', '🎩', 'lincon-cartola.webp',  '{"ATA":58,"DEF":65,"FOR":46,"VEL":65,"ENE":85,"VID":68}'),
  ('eringes',         'eringes',         'Eringes',             'Padrão',   'raro',     'SUPP', 'INT', '✨', 'eringes.webp',         '{"ATA":64,"DEF":65,"FOR":52,"VEL":59,"ENE":90,"VID":68}'),
  ('mago-negro',      'mago',            'Mago Negro',          'Padrão',   'lendario', 'HERO', 'INT', '🧙', 'mago-negro.webp',      '{"ATA":58,"DEF":65,"FOR":46,"VEL":65,"ENE":99,"VID":68}'),
  ('dragao-branco',   'dragao',          'Dragão Branco',       'Branco',   'lendario', 'HERO', 'INT', '🐲', 'dragao-branco.webp',   '{"ATA":64,"DEF":65,"FOR":52,"VEL":59,"ENE":99,"VID":68}'),
  ('siberian',        'siberian',        'Siberian',            'Padrão',   'raro',     'HERO', 'DEF', '🐅', 'siberian.webp',        '{"ATA":70,"DEF":89,"FOR":58,"VEL":59,"ENE":64,"VID":84}'),
  ('rison-egito',     'rison',           'Rison do Egito',      'Padrão',   'raro',     'SUPP', 'DEF', '🏺', 'rison-egito.webp',     '{"ATA":64,"DEF":89,"FOR":52,"VEL":53,"ENE":70,"VID":84}'),
  ('guardiao-saturno','guardiao-saturno','Guardião de Saturno', 'Padrão',   'epico',    'HERO', 'DEF', '🪐', 'guardiao-saturno.webp','{"ATA":70,"DEF":95,"FOR":58,"VEL":53,"ENE":70,"VID":88}')
on conflict (id) do update set
  base = excluded.base, nome = excluded.nome, variante = excluded.variante,
  raridade = excluded.raridade, tipo = excluded.tipo, dom = excluded.dom,
  emoji = excluded.emoji, arte = excluded.arte, stats = excluded.stats;
