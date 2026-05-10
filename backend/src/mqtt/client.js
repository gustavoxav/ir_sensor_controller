/**
 * ============================================
 *  CLIENTE MQTT
 * ============================================
 *
 * Conecta ao broker MQTT, consome mensagens do
 * tópico de ocupação, valida payloads e persiste
 * eventos no banco de dados.
 *
 * Emite atualizações em tempo real via Socket.IO.
 */

const mqtt = require('mqtt');
const EventModel = require('../models/event');

// Armazena o estado atual de cada sala em memória
const roomStates = new Map();

/**
 * Inicializa o cliente MQTT.
 * @param {Object} io - Instância do Socket.IO para emitir eventos
 */
function initMQTT(io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const topic = process.env.MQTT_TOPIC || 'sala/+/ocupacao';

  console.log('[MQTT] Conectando ao broker:', brokerUrl);

  const client = mqtt.connect(brokerUrl, {
    clientId: `backend_occupancy_${Date.now()}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 5000  // Reconexão automática a cada 5s
  });

  // ========================
  // EVENTOS DE CONEXÃO
  // ========================

  client.on('connect', () => {
    console.log('[MQTT] ✓ Conectado ao broker com sucesso!');

    // Subscribe ao tópico (wildcard + para múltiplas salas)
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Erro ao subscrever:', err.message);
      } else {
        console.log(`[MQTT] Subscrito ao tópico: ${topic}`);
      }
    });
  });

  client.on('reconnect', () => {
    console.log('[MQTT] Reconectando ao broker...');
  });

  client.on('error', (error) => {
    console.error('[MQTT] Erro:', error.message);
  });

  client.on('close', () => {
    console.log('[MQTT] Conexão fechada');
  });

  // ========================
  // PROCESSAMENTO DE MENSAGENS
  // ========================

  client.on('message', (receivedTopic, message) => {
    console.log(`[MQTT] Mensagem recebida em: ${receivedTopic}`);

    try {
      // Parse do payload JSON
      const payload = JSON.parse(message.toString());

      // Validar campos obrigatórios
      if (!validatePayload(payload)) {
        console.error('[MQTT] Payload inválido:', message.toString());
        return;
      }

      console.log(`[MQTT] Evento: Sala ${payload.room} | ${payload.event} | Pessoas: ${payload.people_count} | Luz: ${payload.light}`);

      // Atualizar estado em memória
      roomStates.set(payload.room, {
        room: payload.room,
        people_count: payload.people_count,
        light: payload.light,
        last_event: payload.event,
        last_timestamp: payload.timestamp
      });

      // Persistir no banco de dados
      const savedEvent = EventModel.insertEvent(payload);

      // Emitir via Socket.IO para o dashboard
      io.emit('occupancy-update', {
        ...payload,
        id: savedEvent.id
      });

      console.log('[MQTT] Evento processado e emitido via WebSocket');

    } catch (error) {
      console.error('[MQTT] Erro ao processar mensagem:', error.message);
      console.error('[MQTT] Mensagem raw:', message.toString());
    }
  });

  return client;
}

/**
 * Valida o payload recebido via MQTT.
 * @param {Object} payload - Dados recebidos
 * @returns {boolean} true se válido
 */
function validatePayload(payload) {
  if (!payload.room || typeof payload.room !== 'string') {
    console.error('[VALIDATE] Campo "room" ausente ou inválido');
    return false;
  }

  if (typeof payload.people_count !== 'number' || payload.people_count < 0) {
    console.error('[VALIDATE] Campo "people_count" ausente ou inválido');
    return false;
  }

  if (!['ON', 'OFF'].includes(payload.light)) {
    console.error('[VALIDATE] Campo "light" deve ser "ON" ou "OFF"');
    return false;
  }

  if (!['entrada', 'saida'].includes(payload.event)) {
    console.error('[VALIDATE] Campo "event" deve ser "entrada" ou "saida"');
    return false;
  }

  if (!payload.timestamp) {
    console.error('[VALIDATE] Campo "timestamp" ausente');
    return false;
  }

  return true;
}

/**
 * Retorna o estado atual de todas as salas em memória.
 * @returns {Array} Estados das salas
 */
function getRoomStates() {
  return Array.from(roomStates.values());
}

module.exports = { initMQTT, getRoomStates };
