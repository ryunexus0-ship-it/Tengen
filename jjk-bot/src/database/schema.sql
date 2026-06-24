-- ============================================================
--  JJK ROL BOT — Schema PostgreSQL
-- ============================================================

-- Tabla de técnicas malditas
CREATE TABLE IF NOT EXISTS tecnicas (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL UNIQUE,
  rareza          VARCHAR(20)  NOT NULL CHECK (rareza IN ('Comun','Rara','Epica','Legendaria','Mitica')),
  descripcion     TEXT,
  rol_discord_id  VARCHAR(30)
);

-- Tabla principal de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL PRIMARY KEY,
  discord_id       VARCHAR(30)  NOT NULL UNIQUE,
  nombre_personaje VARCHAR(100) NOT NULL,
  raza             VARCHAR(30)  DEFAULT NULL CHECK (raza IN ('Humano','Maldicion','Hibrido') OR raza IS NULL),
  tecnica_id       INTEGER      REFERENCES tecnicas(id) ON DELETE SET NULL DEFAULT NULL,
  rango            VARCHAR(30)  NOT NULL DEFAULT 'Grade 4',
  nivel            INTEGER      NOT NULL DEFAULT 1,
  xp               INTEGER      NOT NULL DEFAULT 0,
  dinero           INTEGER      NOT NULL DEFAULT 500,
  pm               INTEGER      NOT NULL DEFAULT 0,
  skill_points     INTEGER      NOT NULL DEFAULT 0,
  rerolls          INTEGER      NOT NULL DEFAULT 6,
  fuerza           INTEGER      NOT NULL DEFAULT 0,
  velocidad        INTEGER      NOT NULL DEFAULT 0,
  resistencia      INTEGER      NOT NULL DEFAULT 0,
  energia_maldita  INTEGER      NOT NULL DEFAULT 600,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tabla de ítems de tienda
CREATE TABLE IF NOT EXISTS items (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  descripcion   TEXT,
  precio_dinero INTEGER      DEFAULT NULL,
  precio_pm     INTEGER      DEFAULT NULL,
  tipo          VARCHAR(20)  NOT NULL CHECK (tipo IN ('consumible','equipamiento','cosmetico')),
  efecto        TEXT
);

-- Tabla de inventario
CREATE TABLE IF NOT EXISTS inventario (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(id)    ON DELETE CASCADE,
  cantidad   INTEGER NOT NULL DEFAULT 1,
  UNIQUE(usuario_id, item_id)
);

-- Tabla de transacciones (log)
CREATE TABLE IF NOT EXISTS transacciones (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        VARCHAR(50)  NOT NULL,
  cantidad    INTEGER,
  descripcion TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── DATOS INICIALES ────────────────────────────────────────────────────────

-- Ítems de tienda normal (precio_dinero)
INSERT INTO items (nombre, descripcion, precio_dinero, tipo, efecto) VALUES
  ('Reroll x1',               'Un intento extra para el spin de raza o técnica.',              5000,  'consumible', 'reroll:1'),
  ('Reroll x3',               'Tres intentos extra para el spin de raza o técnica.',           12000, 'consumible', 'reroll:3'),
  ('Poción de Energía',       'Restaura la energía maldita del personaje en el rol.',          500,   'consumible', 'energia:full'),
  ('Pergamino Técnica Básica','Otorga una técnica de rareza Común aleatoria.',                 3000,  'consumible', 'tecnica:comun')
ON CONFLICT DO NOTHING;

-- Ítems de tienda PM (precio_pm)
INSERT INTO items (nombre, descripcion, precio_pm, tipo, efecto) VALUES
  ('Divergent Fist (PM)',              'Aprende la técnica Divergent Fist.',               100, 'consumible', 'tecnica:Divergent Fist'),
  ('Black Flash (PM)',                 'Aprende la técnica Black Flash.',                  200, 'consumible', 'tecnica:Black Flash'),
  ('RCT Básico (PM)',                  'Aprende Reversed Cursed Technique nivel básico.',  350, 'consumible', 'tecnica:RCT Basico'),
  ('Cursed Energy Reinforcement (PM)', 'Aprende Cursed Energy Reinforcement.',              50, 'consumible', 'tecnica:Cursed Energy Reinforcement')
ON CONFLICT DO NOTHING;
