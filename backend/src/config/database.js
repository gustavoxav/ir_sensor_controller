/**
 * ============================================
 *  CONFIGURAÇÃO DO BANCO DE DADOS - SQLite
 * ============================================
 *
 * Utiliza better-sqlite3 para banco local.
 * O arquivo .db é criado automaticamente.
 * A tabela 'events' é criada no primeiro uso.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Caminho do banco de dados
const DB_PATH = process.env.DB_PATH || './data/occupancy.db';
const absolutePath = path.resolve(DB_PATH);

// Garantir que o diretório existe
const dbDir = path.dirname(absolutePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`[DB] Diretório criado: ${dbDir}`);
}

// Inicializar banco de dados
const db = new Database(absolutePath);
console.log(`[DB] Banco de dados conectado: ${absolutePath}`);

// Habilitar WAL mode para melhor performance
db.pragma('journal_mode = WAL');

// ========================
// MIGRATION - Criar tabela
// ========================

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    people_count INTEGER NOT NULL DEFAULT 0,
    light TEXT NOT NULL DEFAULT 'OFF',
    event TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Criar índices para consultas frequentes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_room ON events(room);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_events_room_timestamp ON events(room, timestamp);
`);

console.log('[DB] Tabela "events" verificada/criada com sucesso');

module.exports = db;
