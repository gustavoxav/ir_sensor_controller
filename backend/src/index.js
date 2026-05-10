/**
 * ============================================
 *  ENTRY POINT - Backend IoT Ocupação
 * ============================================
 *
 * Inicializa todos os componentes do backend:
 *   1. Express (HTTP + REST API)
 *   2. Socket.IO (WebSocket tempo real)
 *   3. MQTT Client (consumir mensagens do ESP32)
 *   4. SQLite (banco de dados local)
 *
 * Porta padrão: 3000
 */

// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');

// Módulos internos
const { initSocket } = require('./websocket/socket');
const { initMQTT } = require('./mqtt/client');
const occupancyRoutes = require('./routes/occupancy');

// ========================
// CONFIGURAÇÃO
// ========================

const PORT = process.env.PORT || 3000;

// Inicializar Express
const app = express();

// Middlewares
app.use(cors());                    // Permitir requisições cross-origin
app.use(express.json());            // Parse de JSON
app.use(express.urlencoded({ extended: true }));

// ========================
// ROTAS
// ========================

// Rota de saúde do servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Rotas de ocupação
app.use('/api', occupancyRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

// ========================
// SERVIDOR HTTP + SOCKET.IO
// ========================

// Criar servidor HTTP (compartilhado entre Express e Socket.IO)
const server = http.createServer(app);

// Inicializar Socket.IO
const io = initSocket(server);

// ========================
// MQTT
// ========================

// Inicializar cliente MQTT (passa Socket.IO para emitir eventos)
const mqttClient = initMQTT(io);

// ========================
// INICIAR SERVIDOR
// ========================

server.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('  BACKEND IoT - MONITORAMENTO DE OCUPAÇÃO');
  console.log('============================================');
  console.log(`  Servidor:    http://localhost:${PORT}`);
  console.log(`  API REST:    http://localhost:${PORT}/api`);
  console.log(`  WebSocket:   ws://localhost:${PORT}`);
  console.log(`  Health:      http://localhost:${PORT}/api/health`);
  console.log('============================================');
  console.log('');
  console.log('Endpoints disponíveis:');
  console.log(`  GET /api/rooms              → Listar salas`);
  console.log(`  GET /api/rooms/:room/events → Eventos de uma sala`);
  console.log(`  GET /api/rooms/:room/status → Estado atual`);
  console.log(`  GET /api/rooms/:room/history→ Histórico para gráficos`);
  console.log(`  GET /api/stats              → Estatísticas gerais`);
  console.log(`  GET /api/health             → Saúde do servidor`);
  console.log('');
});

// ========================
// GRACEFUL SHUTDOWN
// ========================

process.on('SIGINT', () => {
  console.log('\n[SERVER] Encerrando servidor...');
  mqttClient.end();
  server.close(() => {
    console.log('[SERVER] Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[SERVER] Sinal SIGTERM recebido');
  mqttClient.end();
  server.close(() => {
    process.exit(0);
  });
});
