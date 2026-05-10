# 🏢 Sistema IoT de Monitoramento de Ocupação e Controle Inteligente de Iluminação

Sistema completo de IoT para monitoramento de ocupação e automação de iluminação em tempo real, integrando ESP32, MQTT, backend Node.js, banco de dados SQLite e dashboard Next.js.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Hardware](#hardware)
- [Instalação](#instalação)
- [Execução](#execução)
- [API REST](#api-rest)
- [MQTT](#mqtt)
- [Dashboard](#dashboard)
- [Solução de Problemas](#solução-de-problemas)

---

## 🎯 Visão Geral

O sistema identifica quantas pessoas existem dentro de uma sala utilizando sensores infravermelhos conectados a um ESP32:

- **Se houver pelo menos 1 pessoa** → iluminação ligada
- **Se a última pessoa sair** → iluminação desligada automaticamente
- **Dados transmitidos em tempo real** via MQTT → Backend → Dashboard

---

## 🏗️ Arquitetura

```
[Sensores IR A/B]
       ↓
    [ESP32]          → Detecção de direção + Contagem
       ↓ MQTT
  [Broker MQTT]      → Mosquitto / HiveMQ
       ↓
  [Backend Node.js]  → Express + Socket.IO + SQLite
       ↓
  [Dashboard Next.js] → Tempo real via WebSocket
```

---

## 📁 Estrutura de Pastas

```
IOT/
├── firmware/
│   └── esp32_occupancy/
│       └── esp32_occupancy.ino       # Firmware ESP32
├── backend/
│   ├── package.json
│   ├── .env.example                  # Template de configuração
│   └── src/
│       ├── index.js                  # Entry point
│       ├── config/database.js        # SQLite
│       ├── models/event.js           # CRUD de eventos
│       ├── mqtt/client.js            # Cliente MQTT
│       ├── websocket/socket.js       # Socket.IO
│       └── routes/occupancy.js       # API REST
├── dashboard-occupancy/
│   ├── package.json
│   ├── src/app/
│   │   ├── layout.js                # Layout raiz
│   │   ├── page.js                  # Dashboard principal
│   │   ├── globals.css              # Tailwind + tema
│   │   └── components/
│   │       ├── Header.js
│   │       ├── ThemeToggle.js
│   │       ├── RoomCard.js
│   │       ├── EventTable.js
│   │       └── OccupancyChart.js
└── README.md
```

---

## 🔧 Hardware

### Componentes Necessários

| Componente | Quantidade | Função |
|-----------|-----------|--------|
| ESP32 DevKit | 1 | Microcontrolador |
| Sensor IR | 2 | Detecção de presença |
| LED | 1 | Simulação de iluminação |
| Resistor 220Ω | 1 | Proteção do LED |
| Protoboard + Jumpers | - | Conexões |

### Diagrama de Conexões

```
ESP32 DevKit
├── GPIO 4  → LED (via resistor 220Ω) → GND
├── GPIO 5  → Sensor IR A (OUT) — Lado externo da porta
├── GPIO 18 → Sensor IR B (OUT) — Lado interno da porta
├── 3.3V    → VCC dos sensores
└── GND     → GND dos sensores e LED
```

### Posicionamento dos Sensores

```
   CORREDOR                    SALA
              ┌─────────┐
  [Sensor A]  │  PORTA   │  [Sensor B]
  (GPIO 5)   │          │  (GPIO 18)
              └─────────┘

  Entrada: A detecta primeiro → B detecta depois
  Saída:   B detecta primeiro → A detecta depois
```

---

## 📦 Instalação

### Pré-requisitos

- **Node.js** v18 ou superior
- **npm** v8 ou superior
- **Arduino IDE** (para o firmware ESP32)
- **Broker MQTT** (Mosquitto ou HiveMQ)

### 1. Clonar/Baixar o Projeto

```bash
cd d:\Gust-Faculdade\IOT
```

### 2. Configurar o Broker MQTT

Instale o Mosquitto:
- **Windows**: [Download Mosquitto](https://mosquitto.org/download/)
- **Linux**: `sudo apt install mosquitto mosquitto-clients`

Inicie o broker:
```bash
mosquitto -v
```

### 3. Instalar o Backend

```bash
cd backend
copy .env.example .env
# Edite o .env com o endereço do seu broker MQTT
npm install
```

### 4. Instalar o Dashboard

```bash
cd dashboard-occupancy
npm install
```

### 5. Configurar o Firmware ESP32

1. Abra `firmware/esp32_occupancy/esp32_occupancy.ino` no Arduino IDE
2. Instale a biblioteca **PubSubClient** (Sketch → Include Library → Manage Libraries)
3. Configure:
   - `WIFI_SSID` — Nome da sua rede Wi-Fi
   - `WIFI_PASSWORD` — Senha da rede
   - `MQTT_BROKER` — IP do broker MQTT
   - `ROOM_ID` — Identificador da sala (ex: "101")
4. Selecione a placa ESP32 DevKit e faça o upload

---

## 🚀 Execução

### Ordem de Inicialização

```
1. Broker MQTT    →  mosquitto -v
2. Backend        →  cd backend && npm run dev
3. Dashboard      →  cd dashboard-occupancy && npm run dev
4. ESP32          →  Ligar (alimentação USB)
```

### Iniciar o Backend

```bash
cd backend
npm run dev
```

Saída esperada:
```
============================================
  BACKEND IoT - MONITORAMENTO DE OCUPAÇÃO
============================================
  Servidor:    http://localhost:3000
  API REST:    http://localhost:3000/api
  WebSocket:   ws://localhost:3000
============================================
```

### Iniciar o Dashboard

```bash
cd dashboard-occupancy
npm run dev
```

Acesse: **http://localhost:3001** (ou a porta indicada pelo Next.js)

---

## 🔌 API REST

Base URL: `http://localhost:3000/api`

| Método | Endpoint | Descrição |
|--------|---------|-----------|
| `GET` | `/health` | Status do servidor |
| `GET` | `/rooms` | Lista todas as salas |
| `GET` | `/rooms/:room/status` | Estado atual de uma sala |
| `GET` | `/rooms/:room/events?limit=50` | Histórico de eventos |
| `GET` | `/rooms/:room/history?limit=100` | Dados para gráficos |
| `GET` | `/stats` | Estatísticas gerais |

### Exemplo de Resposta — `/api/rooms`

```json
{
  "success": true,
  "data": [
    {
      "room": "101",
      "people_count": 3,
      "light": "ON",
      "last_event": "entrada",
      "last_timestamp": "2026-05-06T20:30:00"
    }
  ]
}
```

---

## 📡 MQTT

### Configuração

| Parâmetro | Valor |
|-----------|-------|
| Porta | 1883 |
| Protocolo | TCP/IP |
| Tópico | `sala/{room_id}/ocupacao` |
| Formato | JSON |

### Payload

```json
{
  "room": "101",
  "people_count": 3,
  "light": "ON",
  "event": "entrada",
  "timestamp": "2026-05-06T20:30:00"
}
```

### Testar MQTT Manualmente

Publicar evento de teste:
```bash
mosquitto_pub -t "sala/101/ocupacao" -m "{\"room\":\"101\",\"people_count\":2,\"light\":\"ON\",\"event\":\"entrada\",\"timestamp\":\"2026-05-06T20:30:00\"}"
```

Monitorar mensagens:
```bash
mosquitto_sub -t "sala/+/ocupacao" -v
```

---

## 🖥️ Dashboard

### Funcionalidades

- ✅ Cards de sala com ocupação em tempo real
- ✅ Indicador ON/OFF de iluminação
- ✅ Gráfico temporal de ocupação
- ✅ Tabela de eventos recentes
- ✅ Estatísticas rápidas
- ✅ Toggle Dark/Light mode
- ✅ Atualização automática via WebSocket
- ✅ Suporte a múltiplas salas

---

## ❓ Solução de Problemas

### Backend não conecta ao MQTT

1. Verifique se o broker está rodando: `mosquitto -v`
2. Confira o endereço no `.env`: `MQTT_BROKER_URL=mqtt://localhost:1883`
3. Verifique se a porta 1883 não está bloqueada pelo firewall

### Dashboard não recebe dados

1. Confirme que o backend está rodando na porta 3000
2. Verifique o console do browser para erros de WebSocket
3. Confira `NEXT_PUBLIC_BACKEND_URL` se não for localhost

### ESP32 não conecta

1. Verifique credenciais Wi-Fi no firmware
2. Confirme que o ESP32 está na mesma rede que o broker
3. Abra o Monitor Serial (115200 baud) para ver logs

### Banco de dados

- O SQLite cria o arquivo automaticamente em `backend/data/occupancy.db`
- Para resetar, basta deletar o arquivo `.db`

---

## 📄 Licença

Projeto acadêmico — Faculdade IoT
