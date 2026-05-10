#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>

// —— WIFI & HA API SETTINGS —————————————————————————————————————
const char* ssid        = "";
const char* wifiPass    = "";

// Home Assistant HTTP URL (include port if non‑standard)
const char* ha_host     = "http://homeassistant.local:8123";
// Long‑Lived Access Token (create in your HA user profile)
const char* ha_token    = "";

// Control these entities together (one REST call with a list)
const char* entity_ids[] = {
  "",
  ""
};
const size_t num_entities = sizeof(entity_ids) / sizeof(entity_ids[0]);

// ========== SENSOR & LOGIC TUNING ==========
SparkFun_VL53L5CX imager;
const int   INT_PIN                 = 4;      // VL53L5CX INT -> ESP32 GPIO4
const uint16_t detectionDistance    = 400;    // mm; tune to your doorway for "in-doorway" detections

// Direction/occupancy detection thresholds
const uint8_t  MIN_SIDE_CELLS       = 2;      // min cells per side for LEFT/RIGHT detection
const int      leftZoneMax          = 1;      // columns 0–1 = “outside”
const int      rightZoneMin         = 2;      // columns 2–3 = “inside”
const uint8_t  CLEAR_FRAMES_NEEDED  = 1;      // frames with no detection to clear state

// Fast-off anti-flicker for real exits
const uint32_t OFF_HOLD_MS          = 1200;   // short hold after last occupancy to avoid flicker
const bool     QUICK_OFF_ON_CONFIRMED_EXIT = true;

// Pre-light (approach) behavior
const bool     PRESENCE_REQUIRE_LEFT_SIDE = true; // true = approach must be from outside (left side)
const uint8_t  PRESENCE_SIDE_CELLS        = 1;    // more sensitive than MIN_SIDE_CELLS
const uint32_t PRELIGHT_HOLD_MS           = 0;  // keep light briefly if they step away

// NEW: prevent pre-light from retriggering right after a confirmed exit (anti-flicker)
const uint32_t EXIT_SUPPRESS_MS           = 1500; // suppression window after exit

#define DEBUG 1

enum State { IDLE, SAW_LEFT, SAW_RIGHT, WAIT_CLEAR };
State state              = IDLE;
int   occupancyCount     = 0;
bool  lastPublishedState = false;  // last ON/OFF sent to HA
volatile bool newDataReady = false;

uint8_t  clearFrames      = 0;
uint32_t lastOccupiedMs   = 0;

// Pre-light tracking
bool     prelightActive   = false;
uint32_t prelightLastSeen = 0;
uint32_t exitSuppressUntil = 0; // NEW

// ISR: new frame ready
void IRAM_ATTR onFrameReady() {
  newDataReady = true;
}

void debugPrint(const char* msg) {
#if DEBUG
  Serial.println(msg);
#else
  (void)msg;
#endif
}

bool connectWiFi(uint32_t timeoutMs = 15000) {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, wifiPass);
  uint32_t start = millis();
  debugPrint("Connecting to Wi-Fi...");
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < timeoutMs) {
    delay(300);
#if DEBUG
    Serial.print('.');
#endif
  }
#if DEBUG
  if (WiFi.status() == WL_CONNECTED) Serial.println(" ✓");
  else Serial.println(" ✗ (timed out)");
#endif
  return WiFi.status() == WL_CONNECTED;
}

// Build {"entity_id":["a","b",...]}
String buildEntityArrayJson() {
  String body = "{\"entity_id\":[";
  for (size_t i = 0; i < num_entities; i++) {
    body += "\"";
    body += entity_ids[i];
    body += "\"";
    if (i + 1 < num_entities) body += ",";
  }
  body += "]}";
  return body;
}

// Send one REST call to HA to toggle all target entities at once
void publishToHAAll(bool turnOn) {
  if (!connectWiFi()) return;

  HTTPClient http;
  String url = String(ha_host) + "/api/services/homeassistant/" + (turnOn ? "turn_on" : "turn_off");
  String body = buildEntityArrayJson();

  if (!http.begin(url)) {
#if DEBUG
    Serial.println("HTTP begin failed");
#endif
    return;
  }
  http.addHeader("Authorization", String("Bearer ") + ha_token);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(body);
#if DEBUG
  Serial.printf("HA %s -> HTTP %d | %s\n", (turnOn ? "turn_on" : "turn_off"), code, body.c_str());
#endif
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println("\nStarting...");

  connectWiFi();

  // I2C & INT
  Wire.begin(21, 22);
  Wire.setClock(1000000);  // 1 MHz (use 400k if unstable)
  pinMode(INT_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(INT_PIN), onFrameReady, FALLING);

  // VL53L5CX init
  if (!imager.begin()) {
    Serial.println("VL53L5CX not found!");
    while (1) delay(1000);
  }
  imager.setResolution(4 * 4);     // 16 zones
  imager.setRangingFrequency(60);  // 4x4 can handle 60 Hz
  imager.startRanging();

  Serial.println("Door counter ready");
}

void loop() {
  // yield quickly if no new frame
  if (!newDataReady) {
    delay(1);
    return;
  }
  newDataReady = false;

  if (!imager.isDataReady()) return;

  VL53L5CX_ResultsData data;
  imager.getRangingData(&data);

  // --- Compute detections & centroid ---
  uint8_t leftCells = 0, rightCells = 0;
  float sumX = 0;
  int cnt = 0;
  for (int i = 0; i < 16; i++) {
    uint16_t d = data.distance_mm[i];
    if (d == 0 || d >= detectionDistance) continue;
    int col = i % 4;  // check orientation with your mounting
    sumX += col;
    cnt++;
    if (col <= leftZoneMax)  leftCells++;
    if (col >= rightZoneMin) rightCells++;
  }

  // Direction/occupancy detections (stricter)
  bool leftDetected  = (leftCells  >= MIN_SIDE_CELLS);
  bool rightDetected = (rightCells >= MIN_SIDE_CELLS);

  // Presence (pre-light) detections (more sensitive)
  bool leftPresence  = (leftCells  >= PRESENCE_SIDE_CELLS);
  bool rightPresence = (rightCells >= PRESENCE_SIDE_CELLS);

  float centroidX = cnt ? (sumX / cnt) : -1.0f;
  const float midPoint = (leftZoneMax + rightZoneMin) / 2.0f;

  // --- State machine for direction ---
  static float lastCentroidX = -1.0f;
  int oldCount = occupancyCount;   // track before update

  switch (state) {
    case IDLE:
      clearFrames = 0;
      if (leftDetected && !rightDetected) {
        state = SAW_LEFT;
      } else if (rightDetected && !leftDetected) {
        state = SAW_RIGHT;
      } else if (leftDetected && rightDetected) {
        if (lastCentroidX >= 0 && centroidX >= 0) {
          if (centroidX > lastCentroidX) occupancyCount++;          // moving right -> entering
          else occupancyCount = max(0, occupancyCount - 1);         // moving left  -> exiting
        } else if (centroidX >= 0) {
          if (centroidX > midPoint) occupancyCount++;               // right of split -> entering
          else occupancyCount = max(0, occupancyCount - 1);
        }
        state = WAIT_CLEAR;
      }
      break;

    case SAW_LEFT:
      if (rightDetected && !leftDetected) {
        occupancyCount++;         // left -> right : entering
        state = WAIT_CLEAR;
      } else if (!leftDetected && !rightDetected) {
        state = IDLE;
      }
      break;

    case SAW_RIGHT:
      if (leftDetected && !rightDetected) {
        occupancyCount = max(0, occupancyCount - 1);   // right -> left : exiting
        state = WAIT_CLEAR;
      } else if (!leftDetected && !rightDetected) {
        state = IDLE;
      }
      break;

    case WAIT_CLEAR:
      if (!leftDetected && !rightDetected) {
        if (++clearFrames >= CLEAR_FRAMES_NEEDED) {
          state = IDLE;
          clearFrames = 0;
          lastCentroidX = -1.0f;
        }
      } else {
        clearFrames = 0;  // still someone in the doorway
      }
      break;
  }

  if (cnt) lastCentroidX = centroidX;

  // --- Pre-light (approach) logic with exit suppression ---
  uint32_t now = millis();
  bool suppressionActive = (now < exitSuppressUntil); // NEW

  // Only consider pre-light if room is empty (count == 0)
  if (occupancyCount == 0) {
    if (!suppressionActive) {
      bool approachDetected = PRESENCE_REQUIRE_LEFT_SIDE
                              ? leftPresence
                              : (leftPresence || rightPresence);

      if (approachDetected) {
        prelightActive   = true;        // turn lights on early
        prelightLastSeen = now;         // refresh while presence persists
      } else if (prelightActive) {
        // presence disappeared; wait a short hold then clear
        if ((now - prelightLastSeen) > PRELIGHT_HOLD_MS) {
          prelightActive = false;
        }
      }
    } else {
      // While suppressed after exit, do not pre-light
      prelightActive = false;
    }
  } else {
    // Once occupied, pre-light no longer needed
    prelightActive = false;
  }

#if DEBUG
  Serial.printf("Count:%d | L:%u R:%u | cx:%.2f | state:%d | pre:%d | sup:%d\n",
                occupancyCount, leftCells, rightCells, centroidX, state, prelightActive, suppressionActive);
#endif

  // --- Publish with smarter OFF handling ---
  static bool wasOccupied = false;

  // Start occupancy hold only on 0 -> 1 transition (entry)
  if (occupancyCount > 0 && !wasOccupied) {
    lastOccupiedMs = now;
  }
  bool exitJustConfirmed = (oldCount > 0 && occupancyCount == 0);
  wasOccupied = (occupancyCount > 0);

  bool logicallyOccupied = (occupancyCount > 0);
  bool holdKeepsOn = (!logicallyOccupied && (now - lastOccupiedMs) < OFF_HOLD_MS);

  // Lights on if: occupied OR in short post-occupancy hold OR pre-light active
  bool shouldBeOn;
  if (QUICK_OFF_ON_CONFIRMED_EXIT && exitJustConfirmed) {
    shouldBeOn = false;                 // immediate off on confirmed exit
    lastOccupiedMs = 0;                 // cancel residual hold
    prelightActive = false;             // NEW: don't re-light immediately
    exitSuppressUntil = now + EXIT_SUPPRESS_MS; // NEW: suppress pre-light for a bit
  } else {
    shouldBeOn = logicallyOccupied || holdKeepsOn || prelightActive;
  }

  if (shouldBeOn != lastPublishedState) {
    lastPublishedState = shouldBeOn;
    publishToHAAll(shouldBeOn);   // hits both switches in one call
  }
}
