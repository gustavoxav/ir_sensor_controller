const { Server } = require('socket.io');
const EventModel = require('../models/event');
const { getRoomStates } = require('../mqtt/client');

/**
 * Inicializa o Socket.IO no servidor HTTP.
 * @param {Object} httpServer - Servidor HTTP do Express
 * @returns {Object} Instância do Socket.IO
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Cliente conectado: ${socket.id}`);

    try {
      const rooms = EventModel.getAllRooms();
      const memoryStates = getRoomStates();

      const currentState = rooms.map(dbRoom => {
        const memRoom = memoryStates.find(m => m.room === dbRoom.room);
        return memRoom || dbRoom;
      });
      memoryStates.forEach(memRoom => {
        if (!currentState.find(r => r.room === memRoom.room)) {
          currentState.push(memRoom);
        }
      });

      socket.emit('initial-state', currentState);
      console.log(`[WS] Estado inicial enviado: ${currentState.length} sala(s)`);
    } catch (error) {
      console.error('[WS] Erro ao enviar estado inicial:', error.message);
    }

    socket.on('request-history', (data) => {
      try {
        const { room, limit } = data;
        const history = EventModel.getOccupancyHistory(room, limit || 100);
        socket.emit('history-data', { room, history });
        console.log(`[WS] Histórico enviado: Sala ${room} (${history.length} eventos)`);
      } catch (error) {
        console.error('[WS] Erro ao buscar histórico:', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Cliente desconectado: ${socket.id}`);
    });
  });

  console.log('[WS] Socket.IO inicializado');
  return io;
}

module.exports = { initSocket };
