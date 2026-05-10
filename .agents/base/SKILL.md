---
name: smart-occupancy-iot-system
description: Helps develop an IoT-based smart occupancy and lighting control system using ESP32, MQTT, backend APIs, database integration, and a real-time dashboard.
---

# Smart Occupancy IoT System

This skill provides guidance and conventions for building a complete IoT occupancy monitoring and smart lighting automation system using ESP32, MQTT, backend services, and a web dashboard.

The system must support:
- bidirectional people counting;
- automatic light control;
- MQTT communication;
- backend event processing;
- real-time dashboard updates;
- historical event storage.

## When to use this skill

- Use this when developing ESP32-based occupancy monitoring systems.
- Use this for IoT architectures involving MQTT communication.
- Use this when integrating sensors, backend APIs, databases, and dashboards.
- Use this for real-time people counting and lighting automation projects.
- Use this when implementing room occupancy monitoring for classrooms, offices, laboratories, or controlled environments.

## System Architecture

Expected architecture flow:

[Sensors]
    ↓
[ESP32]
    ↓ MQTT
[Broker]
    ↓
[Backend/API]
    ↓
[Database]
    ↓
[Dashboard]

## Hardware Conventions

ESP32 pin mapping:

- LED:
  - GPIO 4

- Sensor A:
  - GPIO 5

- Sensor B:
  - GPIO 18

Sensors must be positioned sequentially at the room entrance to detect movement direction.

## Occupancy Logic

Entry:
- Sensor A triggered first
- Sensor B triggered second
- Increment occupancy counter

Exit:
- Sensor B triggered first
- Sensor A triggered second
- Decrement occupancy counter

Rules:
- Counter must never become negative.
- If occupancy > 0:
  - light ON
- If occupancy == 0:
  - light OFF

The implementation must include:
- debounce protection;
- timeout validation;
- false-trigger prevention;
- sequential detection validation.

## MQTT Conventions

Recommended broker:
- Mosquitto
- HiveMQ

Default MQTT port:
- 1883

Recommended topic structure:
- room/{room_id}/occupancy

Payload format:
```json
{
  "room": "101",
  "people_count": 3,
  "light": "ON",
  "event": "entry",
  "timestamp": "2026-05-06T20:30:00"
}
````

Supported events:

* entry
* exit

## Backend Guidelines

Recommended stack:

* Node.js
* Express
* MQTT.js
* WebSocket or Socket.IO

Backend responsibilities:

* consume MQTT messages;
* validate payloads;
* persist events;
* expose REST APIs;
* provide real-time updates.

Recommended ports:

* API: 3000
* WebSocket: 3001

## Database Guidelines

Recommended databases:

* PostgreSQL
* MongoDB

Suggested fields:

* id
* room
* people_count
* light
* event
* timestamp

## Dashboard Guidelines

Recommended stack:

* React.js

Dashboard responsibilities:

* show real-time occupancy;
* show light status;
* display event history;
* display occupancy charts;
* support multiple rooms.

## ESP32 Development Guidelines

Recommended libraries:

* WiFi.h
* PubSubClient.h

Recommended firmware structure:

* setup_wifi()
* reconnect_mqtt()
* detectMovement()
* updateLightState()
* publishMQTT()

The ESP32 must:

* reconnect automatically to Wi-Fi and MQTT;
* publish real-time occupancy updates;
* maintain local occupancy state;
* avoid duplicated events.

## Development Best Practices

* Use modular architecture.
* Separate frontend, backend, and firmware responsibilities.
* Use environment variables for broker and database credentials.
* Add serial debugging logs.
* Use reusable MQTT topic conventions.
* Keep hardware-independent business logic separated from GPIO handling.
* Support future multi-room scalability.
* Document all APIs and MQTT topics.

## Reference Scripts and Resources

Use the following reference implementation as the firmware base:

.agents\base\examples\ESP32_ToF_Bathroom_Sensor_V3_Share.ino

This reference should guide:

* MQTT connectivity;
* ESP32 structure;
* sensor reading flow;
* event publishing;
* occupancy state management.

