/*
 * ============================================================
 *  SISTEMA IoT - MONITORAMENTO DE OCUPAÇÃO E CONTROLE DE LUZ
 *  Firmware ESP32
 * ============================================================
 *
 *  Descrição:
 *    Utiliza 2 sensores infravermelhos (IR) para detectar
 *    entrada e saída de pessoas em uma sala, controlando
 *    automaticamente a iluminação (LED) e publicando
 *    eventos via MQTT em tempo real.
 *
 *  Hardware:
 *    - ESP32 DevKit
 *    - Sensor IR A → GPIO 5
 *    - Sensor IR B → GPIO 18
 *    - LED (iluminação) → GPIO 4
 *
 *  Comunicação:
 *    - Wi-Fi + MQTT (PubSubClient)
 *    - Tópico: sala/{ROOM_ID}/ocupacao
 *    - Payload: JSON
 *
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>

// Defina como 1 para testar a lógica física (sensores + LED) no Serial Monitor
// sem precisar de Wi-Fi ou MQTT. Mude para 0 para ativar a comunicação online.
#define TEST_LOCAL_ONLY 0

// ========================
// CONFIGURAÇÕES DO SISTEMA
// ========================

// --- Identificação da Sala ---
#define ROOM_ID "101"

// --- Wi-Fi ---
const char* WIFI_SSID     = "LabReDeS";
const char* WIFI_PASSWORD = "cefetfriburgo";

// --- Broker MQTT ---
const char* MQTT_BROKER   = "200.143.224.99";
const int   MQTT_PORT     = 1183;
const char* MQTT_CLIENT   = "esp32_sala_" ROOM_ID;
const char* MQTT_USER     = "AlunosIOT";
const char* MQTT_PASS     = "Brok3rIoT";

// --- Tópico MQTT ---
// Formato: sala/{room_id}/ocupacao
String MQTT_TOPIC = String("sala/") + ROOM_ID + "/ocupacao";

// ========================
// PINAGEM DO HARDWARE
// ========================

#define LED_PIN      4    // LED simulando iluminação
#define SENSOR_A_PIN 5    // Sensor IR A (lado externo da porta)
#define SENSOR_B_PIN 18   // Sensor IR B (lado interno da porta)

// ========================
// PARÂMETROS DE DETECÇÃO
// ========================

#define DEBOUNCE_MS        150    // Debounce por sensor (ms)
#define SEQUENCE_TIMEOUT   2000   // Timeout máximo entre sensor A e B (ms)
#define MIN_EVENT_INTERVAL 500    // Intervalo mínimo entre eventos (ms)

// ========================
// DEPURAÇÃO
// ========================

#define DEBUG 1

void debugPrint(const char* msg) {
#if DEBUG
  Serial.println(msg);
#else
  (void)msg;
#endif
}

void debugPrintf(const char* fmt, ...) {
#if DEBUG
  char buf[256];
  va_list args;
  va_start(args, fmt);
  vsnprintf(buf, sizeof(buf), fmt, args);
  va_end(args);
  Serial.print(buf);
#endif
}

// ========================
// VARIÁVEIS GLOBAIS
// ========================

// --- Máquina de Estados ---
enum State { IDLE, SAW_A, SAW_B, WAIT_CLEAR };
State currentState = IDLE;

// --- Contagem de Ocupação ---
int occupancyCount = 0;

// --- Estado do LED ---
bool ledState = false;

// --- Debounce ---
unsigned long lastTriggerA = 0;
unsigned long lastTriggerB = 0;

// --- Controle de Sequência ---
unsigned long sequenceStartTime = 0;

// --- Controle de Eventos ---
unsigned long lastEventTime = 0;

// --- Clientes de Rede ---
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ========================
// CONFIGURAÇÃO WI-FI
// ========================

/**
 * Conecta ao Wi-Fi com timeout configurável.
 * Retorna true se conectou com sucesso.
 */
bool setup_wifi(uint32_t timeoutMs = 15000) {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  debugPrint("==============================");
  debugPrintf("Conectando ao Wi-Fi: %s\n", WIFI_SSID);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < timeoutMs) {
    delay(300);
#if DEBUG
    Serial.print('.');
#endif
  }

  if (WiFi.status() == WL_CONNECTED) {
    debugPrint("");
    debugPrintf("Wi-Fi conectado! IP: %s\n", WiFi.localIP().toString().c_str());
    debugPrint("==============================");

    // Configurar NTP para timestamps
    configTime(-3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
    debugPrint("NTP configurado (UTC-3)");

    return true;
  } else {
    debugPrint("\nFalha ao conectar ao Wi-Fi!");
    return false;
  }
}

// ========================
// CONFIGURAÇÃO MQTT
// ========================

/**
 * Reconecta ao broker MQTT.
 * Tenta reconectar com backoff simples.
 */
void reconnect_mqtt() {
  if (mqttClient.connected()) return;

  debugPrint("Conectando ao broker MQTT...");

  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    debugPrintf("Tentativa %d de conexão MQTT...\n", attempts + 1);

    // Conectar usando as credenciais do broker (Username e Password)
    if (mqttClient.connect(MQTT_CLIENT, MQTT_USER, MQTT_PASS)) {
      debugPrint("MQTT conectado com sucesso!");
      debugPrintf("Tópico: %s\n", MQTT_TOPIC.c_str());
    } else {
      debugPrintf("Falha MQTT. Código: %d\n", mqttClient.state());
      delay(2000);
    }
    attempts++;
  }
}

// ========================
// TIMESTAMP
// ========================

/**
 * Retorna o timestamp atual no formato ISO 8601.
 * Ex: "2026-05-06T20:30:00"
 */
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "0000-00-00T00:00:00";
  }

  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buf);
}

// ========================
// DETECÇÃO DE MOVIMENTO
// ========================

/**
 * Lê os sensores IR com debounce e detecta a direção
 * do movimento utilizando uma máquina de estados.
 *
 * Retorna:
 *   1  → Entrada detectada (A primeiro, depois B)
 *  -1  → Saída detectada (B primeiro, depois A)
 *   0  → Nenhum evento
 */
int detectarMovimento() {
  unsigned long now = millis();

  // Leitura dos sensores (LOW = objeto detectado para sensores IR típicos)
  bool sensorA = digitalRead(SENSOR_A_PIN) == LOW;
  bool sensorB = digitalRead(SENSOR_B_PIN) == LOW;

  // Aplicar debounce
  if (sensorA && (now - lastTriggerA) < DEBOUNCE_MS) sensorA = false;
  if (sensorB && (now - lastTriggerB) < DEBOUNCE_MS) sensorB = false;

  // Atualizar timestamps de debounce
  if (sensorA) lastTriggerA = now;
  if (sensorB) lastTriggerB = now;

  // Verificar timeout da sequência
  if (currentState != IDLE && currentState != WAIT_CLEAR) {
    if ((now - sequenceStartTime) > SEQUENCE_TIMEOUT) {
      debugPrint("[TIMEOUT] Sequência expirou. Voltando a IDLE.");
      currentState = IDLE;
      return 0;
    }
  }

  // Prevenir eventos muito próximos
  if ((now - lastEventTime) < MIN_EVENT_INTERVAL) {
    return 0;
  }

  // --- Máquina de Estados ---
  int result = 0;

  switch (currentState) {
    case IDLE:
      if (sensorA && !sensorB) {
        // Sensor A detectou primeiro → possível entrada
        currentState = SAW_A;
        sequenceStartTime = now;
        debugPrint("[STATE] IDLE → SAW_A (possível entrada)");
      } else if (sensorB && !sensorA) {
        // Sensor B detectou primeiro → possível saída
        currentState = SAW_B;
        sequenceStartTime = now;
        debugPrint("[STATE] IDLE → SAW_B (possível saída)");
      }
      break;

    case SAW_A:
      if (sensorB && !sensorA) {
        // A → B: Entrada confirmada!
        result = 1;
        currentState = WAIT_CLEAR;
        lastEventTime = now;
        debugPrint("[EVENT] ENTRADA detectada! (A → B)");
      }
      break;

    case SAW_B:
      if (sensorA && !sensorB) {
        // B → A: Saída confirmada!
        result = -1;
        currentState = WAIT_CLEAR;
        lastEventTime = now;
        debugPrint("[EVENT] SAÍDA detectada! (B → A)");
      }
      break;

    case WAIT_CLEAR:
      // Aguardar ambos os sensores ficarem livres antes de aceitar novo evento
      if (!sensorA && !sensorB) {
        currentState = IDLE;
        debugPrint("[STATE] WAIT_CLEAR → IDLE (sensores livres)");
      }
      break;
  }

  return result;
}

// ========================
// ATUALIZAÇÃO DE ESTADO
// ========================

/**
 * Atualiza o contador de ocupação e o estado do LED.
 *
 * @param direction  1 = entrada, -1 = saída
 * @return true se o estado mudou (para publicar MQTT)
 */
bool atualizarEstado(int direction) {
  if (direction == 0) return false;

  int oldCount = occupancyCount;

  if (direction == 1) {
    occupancyCount++;
    debugPrintf("[COUNTER] Entrada: %d → %d\n", oldCount, occupancyCount);
  } else if (direction == -1) {
    occupancyCount = max(0, occupancyCount - 1);  // Nunca negativo
    debugPrintf("[COUNTER] Saída: %d → %d\n", oldCount, occupancyCount);
  }

  // Atualizar LED baseado na ocupação
  bool newLedState = (occupancyCount > 0);

  if (newLedState != ledState) {
    ledState = newLedState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    debugPrintf("[LED] %s\n", ledState ? "LIGADO ✓" : "DESLIGADO ✗");
  }

  return true;  // Estado mudou, publicar
}

// ========================
// PUBLICAÇÃO MQTT
// ========================

/**
 * Publica o estado atual via MQTT em formato JSON.
 *
 * @param event  "entrada" ou "saida"
 */
void publicarMQTT(const char* event) {
  if (!mqttClient.connected()) {
    debugPrint("[MQTT] Não conectado. Tentando reconectar...");
    reconnect_mqtt();
    if (!mqttClient.connected()) {
      debugPrint("[MQTT] Falha ao reconectar. Evento não publicado.");
      return;
    }
  }

  // Montar payload JSON
  String payload = "{";
  payload += "\"room\":\"" + String(ROOM_ID) + "\",";
  payload += "\"people_count\":" + String(occupancyCount) + ",";
  payload += "\"light\":\"" + String(ledState ? "ON" : "OFF") + "\",";
  payload += "\"event\":\"" + String(event) + "\",";
  payload += "\"timestamp\":\"" + getTimestamp() + "\"";
  payload += "}";

  // Publicar no tópico MQTT
  bool success = mqttClient.publish(MQTT_TOPIC.c_str(), payload.c_str());

  if (success) {
    debugPrint("------------------------------");
    debugPrintf("[MQTT] Publicado em: %s\n", MQTT_TOPIC.c_str());
    debugPrintf("[MQTT] Payload: %s\n", payload.c_str());
    debugPrint("------------------------------");
  } else {
    debugPrint("[MQTT] ERRO ao publicar!");
  }
}

// ========================
// SETUP
// ========================

void setup() {
  // Inicializar Serial para debug
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("============================================");
  Serial.println("  SISTEMA DE MONITORAMENTO DE OCUPAÇÃO");
  Serial.println("  Sala: " ROOM_ID);
  Serial.println("============================================");

  // Configurar pinos
  pinMode(LED_PIN, OUTPUT);
  pinMode(SENSOR_A_PIN, INPUT_PULLUP);
  pinMode(SENSOR_B_PIN, INPUT_PULLUP);

  // LED desligado inicialmente
  digitalWrite(LED_PIN, LOW);

  debugPrint("[SETUP] Pinos configurados:");
  debugPrintf("  LED:      GPIO %d\n", LED_PIN);
  debugPrintf("  Sensor A: GPIO %d\n", SENSOR_A_PIN);
  debugPrintf("  Sensor B: GPIO %d\n", SENSOR_B_PIN);

  // Conectar Wi-Fi e MQTT (somente se não estiver em modo de teste local)
#if !TEST_LOCAL_ONLY
  setup_wifi();

  // Configurar MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  reconnect_mqtt();
#else
  debugPrint("[TESTE] Modo local ativo! Sensores e LED funcionando offline.");
#endif

  debugPrint("");
  debugPrint("[SETUP] Sistema pronto!");
  debugPrintf("[SETUP] Ocupação inicial: %d\n", occupancyCount);
  debugPrintf("[SETUP] LED: %s\n", ledState ? "LIGADO" : "DESLIGADO");
  debugPrint("============================================");
  debugPrint("");
}

// ========================
// LOOP PRINCIPAL
// ========================

void loop() {
#if !TEST_LOCAL_ONLY
  // Manter conexão MQTT ativa
  if (!mqttClient.connected()) {
    reconnect_mqtt();
  }
  mqttClient.loop();

  // Verificar conexão Wi-Fi
  if (WiFi.status() != WL_CONNECTED) {
    debugPrint("[WIFI] Conexão perdida. Reconectando...");
    setup_wifi();
  }
#endif

  // Detectar movimento
  int direction = detectarMovimento();

  // Atualizar estado e publicar se houve mudança
  if (atualizarEstado(direction)) {
    const char* event = (direction == 1) ? "entrada" : "saida";
#if !TEST_LOCAL_ONLY
    publicarMQTT(event);
#else
    debugPrintf("[LOCAL] Ocupação: %d | LED: %s | Evento: %s\n", occupancyCount, ledState ? "ON" : "OFF", event);
#endif
  }

  // Pequeno delay para estabilidade
  delay(10);
}
