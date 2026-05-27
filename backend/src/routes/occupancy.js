/**
 * Endpoints para consulta de dados de ocupação.
 *
 * Rotas:
 *   GET /api/rooms             - Lista todas as salas
 *   GET /api/rooms/:room/events - Histórico de eventos
 *   GET /api/rooms/:room/status - Estado atual de uma sala
 *   GET /api/rooms/:room/history - Histórico para gráficos
 *   GET /api/stats             - Estatísticas gerais
 */

const express = require('express');
const router = express.Router();
const EventModel = require('../models/event');

// ========================
// GET /api/rooms
// Lista todas as salas com estado atual
// ========================
router.get('/rooms', (req, res) => {
  try {
    const rooms = EventModel.getAllRooms();
    console.log(`[API] GET /api/rooms → ${rooms.length} sala(s)`);
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('[API] Erro em GET /rooms:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// ========================
// GET /api/rooms/:room/events
// Histórico de eventos de uma sala
// Query params: ?limit=50
// ========================
router.get('/rooms/:room/events', (req, res) => {
  try {
    const { room } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const events = EventModel.getEventsByRoom(room, limit);
    console.log(`[API] GET /api/rooms/${room}/events → ${events.length} evento(s)`);

    res.json({
      success: true,
      data: {
        room,
        total: events.length,
        events
      }
    });
  } catch (error) {
    console.error(`[API] Erro em GET /rooms/${req.params.room}/events:`, error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// ========================
// GET /api/rooms/:room/status
// Estado atual de uma sala
// ========================
router.get('/rooms/:room/status', (req, res) => {
  try {
    const { room } = req.params;
    const latest = EventModel.getLatestByRoom(room);

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: `Sala "${room}" não encontrada`
      });
    }

    console.log(`[API] GET /api/rooms/${room}/status → Pessoas: ${latest.people_count}`);

    res.json({
      success: true,
      data: {
        room,
        people_count: latest.people_count,
        light: latest.light,
        last_event: latest.event,
        last_timestamp: latest.timestamp
      }
    });
  } catch (error) {
    console.error(`[API] Erro em GET /rooms/${req.params.room}/status:`, error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// ========================
// GET /api/rooms/:room/history
// Histórico de ocupação para gráficos
// Query params: ?limit=100
// ========================
router.get('/rooms/:room/history', (req, res) => {
  try {
    const { room } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const history = EventModel.getOccupancyHistory(room, limit);
    console.log(`[API] GET /api/rooms/${room}/history → ${history.length} registro(s)`);

    res.json({
      success: true,
      data: {
        room,
        total: history.length,
        history
      }
    });
  } catch (error) {
    console.error(`[API] Erro em GET /rooms/${req.params.room}/history:`, error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// ========================
// GET /api/stats
// Estatísticas gerais do sistema
// ========================
router.get('/stats', (req, res) => {
  try {
    const stats = EventModel.getStats();
    console.log('[API] GET /api/stats');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] Erro em GET /stats:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;
