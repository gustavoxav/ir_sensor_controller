/**
 * ============================================
 *  MODEL - Eventos de Ocupação
 * ============================================
 *
 * Funções para manipulação de eventos no banco
 * de dados SQLite.
 */

const db = require('../config/database');

// ========================
// PREPARED STATEMENTS
// ========================

// Inserir novo evento
const insertStmt = db.prepare(`
  INSERT INTO events (room, people_count, light, event, timestamp)
  VALUES (@room, @people_count, @light, @event, @timestamp)
`);

// Buscar eventos por sala (com limite)
const getByRoomStmt = db.prepare(`
  SELECT * FROM events
  WHERE room = ?
  ORDER BY id DESC
  LIMIT ?
`);

// Buscar último evento de uma sala
const getLatestStmt = db.prepare(`
  SELECT * FROM events
  WHERE room = ?
  ORDER BY id DESC
  LIMIT 1
`);

// Listar todas as salas distintas
const getAllRoomsStmt = db.prepare(`
  SELECT DISTINCT room FROM events
  ORDER BY room
`);

// Estatísticas gerais
const getStatsStmt = db.prepare(`
  SELECT
    COUNT(*) as total_events,
    COUNT(DISTINCT room) as total_rooms,
    SUM(CASE WHEN event = 'entrada' THEN 1 ELSE 0 END) as total_entries,
    SUM(CASE WHEN event = 'saida' THEN 1 ELSE 0 END) as total_exits
  FROM events
`);

// Buscar histórico de ocupação para gráfico (últimas N horas)
const getOccupancyHistoryStmt = db.prepare(`
  SELECT room, people_count, light, event, timestamp
  FROM events
  WHERE room = ?
  ORDER BY id DESC
  LIMIT ?
`);

// ========================
// FUNÇÕES EXPORTADAS
// ========================

/**
 * Insere um novo evento de ocupação no banco.
 * @param {Object} data - Dados do evento
 * @param {string} data.room - Identificador da sala
 * @param {number} data.people_count - Contagem de pessoas
 * @param {string} data.light - Estado da luz ("ON" ou "OFF")
 * @param {string} data.event - Tipo de evento ("entrada" ou "saida")
 * @param {string} data.timestamp - Timestamp ISO 8601
 * @returns {Object} Resultado da inserção
 */
function insertEvent(data) {
  try {
    const result = insertStmt.run({
      room: data.room,
      people_count: data.people_count,
      light: data.light,
      event: data.event,
      timestamp: data.timestamp
    });
    console.log(`[MODEL] Evento inserido: ID ${result.lastInsertRowid} | Sala ${data.room} | ${data.event}`);
    return { id: result.lastInsertRowid, ...data };
  } catch (error) {
    console.error('[MODEL] Erro ao inserir evento:', error.message);
    throw error;
  }
}

/**
 * Busca eventos de uma sala com limite.
 * @param {string} room - Identificador da sala
 * @param {number} limit - Número máximo de eventos (default: 50)
 * @returns {Array} Lista de eventos
 */
function getEventsByRoom(room, limit = 50) {
  return getByRoomStmt.all(room, limit);
}

/**
 * Busca o último evento de uma sala.
 * @param {string} room - Identificador da sala
 * @returns {Object|undefined} Último evento ou undefined
 */
function getLatestByRoom(room) {
  return getLatestStmt.get(room);
}

/**
 * Lista todas as salas distintas com seu estado atual.
 * @returns {Array} Lista de salas com último estado
 */
function getAllRooms() {
  const rooms = getAllRoomsStmt.all();
  return rooms.map(r => {
    const latest = getLatestByRoom(r.room);
    return {
      room: r.room,
      people_count: latest ? latest.people_count : 0,
      light: latest ? latest.light : 'OFF',
      last_event: latest ? latest.event : null,
      last_timestamp: latest ? latest.timestamp : null
    };
  });
}

/**
 * Retorna estatísticas gerais do sistema.
 * @returns {Object} Estatísticas
 */
function getStats() {
  return getStatsStmt.get();
}

/**
 * Busca histórico de ocupação para gráficos.
 * @param {string} room - Identificador da sala
 * @param {number} limit - Número de registros (default: 100)
 * @returns {Array} Histórico de ocupação
 */
function getOccupancyHistory(room, limit = 100) {
  return getOccupancyHistoryStmt.all(room, limit).reverse();
}

module.exports = {
  insertEvent,
  getEventsByRoom,
  getLatestByRoom,
  getAllRooms,
  getStats,
  getOccupancyHistory
};
