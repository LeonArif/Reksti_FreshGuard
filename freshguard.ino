// =============================================================================
//  FRESH GUARD — ESP32 Sensor Firmware
//  Food Spoilage Detection System
//  Target: ESP32-WROOM-32 (Arduino IDE)
// =============================================================================
//
//  HARDWARE & PIN MAPPING:
//
//    OLED 128x64 (I2C — Wire / primary bus)
//      SCL → GPIO 27
//      SDA → GPIO 26
//      VCC → 3.3V | GND → GND
//
//    BME280 (I2C — Wire1 / secondary bus)
//      SCL → GPIO 25
//      SDA → GPIO 33
//      VCC → 3.3V | GND → GND
//      NOTE: Replaces DHT22. BME280 gives temperature + humidity + pressure.
//            Separate bus from OLED avoids address conflicts.
//
//    MQ-135 (Air quality / VOC)
//      AO  → GPIO 32   (ADC1_CH4 — analog output, 12-bit)
//      DO  → GPIO 35   (digital threshold output — input-only pin on ESP32)
//      VCC → 5V | GND → GND
//
//    LED Green  → GPIO 14  (via 220Ω resistor to GND)
//    LED Yellow → GPIO 12  (via 220Ω resistor to GND)
//    LED Red    → GPIO 13  (via 220Ω resistor to GND)
//
//    MQ-136 (H2S) → NOT physically installed
//                   Static 5.0 ppm placeholder used in payload
//
//  BACKEND — Supabase REST API (PostgREST)
//    Table  : kondisi_makanan
//    Columns: mq_135, mq_136, temperature, humidity, h2s, voc, amonia,
//             tvc, rsl_minutes, class
//
//  LIBRARIES TO INSTALL (Arduino IDE → Sketch → Include Library → Manage Libraries):
//    1. Adafruit BME280 Library   — by Adafruit
//    2. Adafruit Unified Sensor   — by Adafruit  (dependency)
//    3. ArduinoJson               — by Benoit Blanchon  (v6 or v7)
//    4. Adafruit SSD1306          — by Adafruit  (OLED)
//    5. Adafruit GFX Library      — by Adafruit  (dependency of SSD1306)
//    (WiFi, HTTPClient, Wire, Wire1 built into ESP32 Arduino core)
//
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — CONFIGURABLE VARIABLES  (edit before flashing)
// ─────────────────────────────────────────────────────────────────────────────

// Wi-Fi
const char* WIFI_SSID     = "Gak Tau";
const char* WIFI_PASSWORD = "12345678";

// Backend API
const char* `BACKEND_URL = "http://192.168.1.18:3001";  // Ganti ke IP laptop/PC yang menjalankan backend

// ── Pin Assignments ───────────────────────────────────────────────────────────

// OLED — Wire (primary I2C)
const int PIN_OLED_SCL   = 27;
const int PIN_OLED_SDA   = 26;

// BME280 — Wire1 (secondary I2C)
const int PIN_BME_SCL    = 25;
const int PIN_BME_SDA    = 33;

// MQ-135
const int PIN_MQ135_AO   = 32;   // Analog output  (ADC)
const int PIN_MQ135_DO   = 35;   // Digital output (threshold alarm, input-only)

// LEDs
const int PIN_LED_GREEN  = 14;
const int PIN_LED_YELLOW = 12;
const int PIN_LED_RED    = 13;

// ── MQ-136 Placeholder (H2S sensor not installed) ────────────────────────────
const float MQ136_PLACEHOLDER_PPM = 140.0f;  // Static value for testing (typical indoor H2S levels are 0.1-200 ppm)

// ── Timing ────────────────────────────────────────────────────────────────────
const unsigned long READ_INTERVAL_MS        = 10000UL;  // Read sensors every 10 s
const unsigned long UPLOAD_INTERVAL_MS      = 30000UL;  // POST to Supabase every 30 s
const unsigned long COMMAND_CHECK_INTERVAL_MS = 5000UL; // Check for frontend request every 5 s
const unsigned long UPLOAD_REQUEST_EXPIRY_MS  = 60000UL; // Request expires after 60 s
const int           WIFI_TIMEOUT_SEC         = 20;

// ── MQ-135 Calibration ───────────────────────────────────────────────────────
// ADC: 12-bit (0–4095), Vref = 3.3 V
const float MQ135_R_LOAD   = 10.0f;   // kΩ — load resistor on breakout
const float MQ135_RO_CLEAN = 76.63f;  // kΩ — Ro in clean air. Calibrate after 48 h warm-up!

// MQ-135 DO: most breakouts are active LOW (LOW = alarm triggered)
const bool MQ135_ALARM_ACTIVE_LOW = true;

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — INCLUDES
// ─────────────────────────────────────────────────────────────────────────────

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_BME280.h>

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — OBJECTS & GLOBALS
// ─────────────────────────────────────────────────────────────────────────────

// OLED on Wire (SCL=27, SDA=26) — I2C addr 0x3C typical
#define OLED_WIDTH  128
#define OLED_HEIGHT  64
#define OLED_RESET   -1
Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET);

// BME280 on Wire1 (SCL=25, SDA=33)
Adafruit_BME280 bme;

// Backend endpoints (built in setup)
char ingestEndpoint[140];
char commandEndpoint[140];

// Global sensor values
float g_temperature   = 0.0f;
float g_humidity      = 0.0f;
float g_pressure      = 0.0f;
int   g_mq135_adc     = 0;        // Raw ADC value (0-4095) — primary for backend
float g_mq135_ppm     = 0.0f;     // Derived from ADC for display only
bool  g_mq135_alarm   = false;
const float g_mq136_ppm = MQ136_PLACEHOLDER_PPM;
bool  g_reading_ok    = false;

// Timing
unsigned long g_last_read_ms    = 0;
unsigned long g_last_upload_ms  = 0;
unsigned long g_last_command_check_ms = 0;

// Upload status
bool g_last_upload_ok = false;
int  g_http_code      = 0;

// On-demand control (triggered by frontend button)
bool g_force_upload_requested = false;  // Set when frontend requests upload
unsigned long g_upload_request_expiry_ms = 0;  // Expiry timestamp
bool g_wifi_initialized = false;  // Track if WiFi init attempted

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 — FUNCTION PROTOTYPES
// ─────────────────────────────────────────────────────────────────────────────

void   connectWiFi();
bool   ensureWiFi();
bool   readBME280(float& temp, float& hum, float& pres);
int    readMQ135ADC();        // Raw ADC for backend
float  readMQ135PPMfromADC(int adc);  // Derived PPM for display
bool   readMQ135Alarm();
bool   postToBackend(float temp, float hum, int mq135_adc, float mq136);
bool   shouldForceUpload();
String buildIngestJSON(float temp, float hum, float mq135, float mq136);
void   updateLEDs(float mq135, bool alarm);
void   updateOLED(float temp, float hum, float pres, float mq135,
                  bool alarm, bool upload_ok, int http_code);

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5 — SETUP
// ─────────────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\n[FreshGuard] Booting...");

  // ── LEDs ─────────────────────────────────────────────────────────────────
  pinMode(PIN_LED_GREEN,  OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED,    OUTPUT);
  digitalWrite(PIN_LED_GREEN,  LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED,    LOW);

  // GPIO 35 is input-only — no pinMode needed for MQ-135 DO

  // ── ADC for MQ-135 AO (GPIO 32) ──────────────────────────────────────────
  analogReadResolution(12);         // 0–4095
  analogSetAttenuation(ADC_11db);  // full-scale ~3.3 V
  Serial.printf("[MQ-135] AO=GPIO%d  DO=GPIO%d\n", PIN_MQ135_AO, PIN_MQ135_DO);

  // ── Build backend endpoints ───────────────────────────────────────────────
  snprintf(ingestEndpoint, sizeof(ingestEndpoint),
           "%s/api/food/ingest", BACKEND_URL);
  snprintf(commandEndpoint, sizeof(commandEndpoint),
           "%s/api/food/command", BACKEND_URL);
  Serial.printf("[HTTP] Ingest: %s\n", ingestEndpoint);
  Serial.printf("[HTTP] Command: %s\n", commandEndpoint);

  // ── I2C Bus 0 — OLED (Wire: SDA=26, SCL=27) ──────────────────────────────
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("[OLED] 0x3C failed — trying 0x3D...");
    if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3D)) {
      Serial.println("[OLED] Not found — continuing without display");
    }
  } else {
    Serial.println("[OLED] OK (SDA=26, SCL=27)");
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);
    oled.setCursor(16, 20);
    oled.println("  FRESH GUARD v1.0");
    oled.setCursor(30, 36);
    oled.println("  Booting...");
    oled.display();
  }

  // ── I2C Bus 1 — BME280 (Wire1: SDA=33, SCL=25) ───────────────────────────
  Wire1.begin(PIN_BME_SDA, PIN_BME_SCL);
  // BME280 default address: 0x76 (SDO→GND). Use 0x77 if SDO is pulled HIGH.
  if (!bme.begin(0x76, &Wire1)) {
    Serial.println("[BME280] 0x76 failed — trying 0x77...");
    if (!bme.begin(0x77, &Wire1)) {
      Serial.println("[BME280] FATAL: not found on SDA=33, SCL=25 — halting");
      // Rapid red blink = hardware fault
      while (true) {
        digitalWrite(PIN_LED_RED, HIGH); delay(250);
        digitalWrite(PIN_LED_RED, LOW);  delay(250);
      }
    }
  }
  Serial.println("[BME280] OK (SDA=33, SCL=25)");
  bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                  Adafruit_BME280::SAMPLING_X2,   // temperature oversampling
                  Adafruit_BME280::SAMPLING_X16,  // pressure oversampling
                  Adafruit_BME280::SAMPLING_X1,   // humidity oversampling
                  Adafruit_BME280::FILTER_X16,
                  Adafruit_BME280::STANDBY_MS_500);

  // ── Wi-Fi (deferred — will connect on first command check) ────────────────
  Serial.println("[WiFi] Deferred (will connect on first use)");

  Serial.println("[FreshGuard] Setup complete\n");
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 6 — MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────

void loop() {
  unsigned long now = millis();

  // ── LAZY WIFI INIT (first loop only) ──────────────────────────────────────
  if (!g_wifi_initialized) {
    g_wifi_initialized = true;
    Serial.println("[WiFi] Initializing WiFi (first loop)...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    // Don't wait, just start connection in background
  }

  // ── CHECK COMMAND ENDPOINT (on-demand trigger from frontend) ──────────────
  if (now - g_last_command_check_ms >= COMMAND_CHECK_INTERVAL_MS || g_last_command_check_ms == 0) {
    g_last_command_check_ms = now;
    
    // Attempt WiFi if not connected
    if (WiFi.status() != WL_CONNECTED) {
      Serial.printf("[WiFi] Status: %d (not connected yet)\n", WiFi.status());
      // Try to advance connection
      int wait = 0;
      while (WiFi.status() != WL_CONNECTED && wait < 5) {
        delay(500);
        wait++;
      }
    }
    
    // Only check command if WiFi is connected
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("[Command] WiFi connected, checking command endpoint...");
      if (shouldForceUpload()) {
        Serial.println("[Command] ✓ Frontend requested upload!");
        g_force_upload_requested = true;
        g_upload_request_expiry_ms = now + UPLOAD_REQUEST_EXPIRY_MS;
        // Reset timing so sensor read + upload happen immediately
        g_last_read_ms   = 0;
        g_last_upload_ms = 0;
      }
    } else {
      Serial.printf("[Command] WiFi still connecting... (status: %d)\n", WiFi.status());
    }
  }

  // ── CHECK REQUEST EXPIRY ──────────────────────────────────────────────────
  if (g_force_upload_requested && (now > g_upload_request_expiry_ms)) {
    Serial.println("[Command] Upload request expired");
    g_force_upload_requested = false;
  }

  // ── READ SENSORS (only if requested from frontend) ────────────────────────
  bool should_read = g_force_upload_requested;
  
  if (should_read && (now - g_last_read_ms >= READ_INTERVAL_MS || g_last_read_ms == 0)) {
    g_last_read_ms = now;

    float temp = 0, hum = 0, pres = 0;
    if (readBME280(temp, hum, pres)) {
      g_temperature = temp;
      g_humidity    = hum;
      g_pressure    = pres;
      g_reading_ok  = true;
    } else {
      Serial.println("[BME280] Read failed — using previous values");
    }

    g_mq135_adc   = readMQ135ADC();
    g_mq135_ppm   = readMQ135PPMfromADC(g_mq135_adc);  // For display only
    g_mq135_alarm = readMQ135Alarm();

    updateLEDs(g_mq135_ppm, g_mq135_alarm);
    updateOLED(g_temperature, g_humidity, g_pressure, g_mq135_ppm,
               g_mq135_alarm, g_last_upload_ok, g_http_code);

    Serial.printf(
      "[Sensors] Temp=%.2f°C  Hum=%.2f%%  Pres=%.1fhPa  "
      "MQ135_ADC=%d  MQ135_PPM=%.2fppm  DO=%s  MQ136*=%.2fppm\n",
      g_temperature, g_humidity, g_pressure, g_mq135_adc, g_mq135_ppm,
      g_mq135_alarm ? "ALARM" : "OK", g_mq136_ppm);
  }

  // ── UPLOAD (only if request is active) ─────────────────────────────────────
  if (g_force_upload_requested && g_reading_ok) {
    if (now - g_last_upload_ms >= UPLOAD_INTERVAL_MS || g_last_upload_ms == 0) {
      g_last_upload_ms = now;

      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[Upload] Sending data from frontend request...");
        g_last_upload_ok = postToBackend(
          g_temperature, g_humidity, g_mq135_adc, g_mq136_ppm);
        
        if (g_last_upload_ok) {
          Serial.println("[Upload] SUCCESS — clearing request flag");
          g_force_upload_requested = false;
        }
      } else {
        Serial.println("[Upload] WiFi not connected, will retry");
        g_last_upload_ok = false;
      }
      updateOLED(g_temperature, g_humidity, g_pressure, g_mq135_ppm,
                 g_mq135_alarm, g_last_upload_ok, g_http_code);
    }
  }

  // ── ALWAYS UPDATE OLED (show last sensor values) ──────────────────────────
  static unsigned long g_last_oled_update_ms = 0;
  const unsigned long OLED_UPDATE_INTERVAL_MS = 1000UL;  // Update OLED every 1 second
  if (now - g_last_oled_update_ms >= OLED_UPDATE_INTERVAL_MS) {
    g_last_oled_update_ms = now;
    updateOLED(g_temperature, g_humidity, g_pressure, g_mq135_ppm,
               g_mq135_alarm, g_last_upload_ok, g_http_code);
  }

  delay(50);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 7 — WI-FI
// ─────────────────────────────────────────────────────────────────────────────

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int waited = 0;
  while (WiFi.status() != WL_CONNECTED && waited < WIFI_TIMEOUT_SEC) {
    delay(1000); Serial.print("."); waited++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected — IP: %s\n",
                  WiFi.localIP().toString().c_str());
    digitalWrite(PIN_LED_GREEN, HIGH); delay(300); digitalWrite(PIN_LED_GREEN, LOW);
  } else {
    Serial.println("\n[WiFi] FAILED — will retry before each upload");
    digitalWrite(PIN_LED_RED, HIGH); delay(300); digitalWrite(PIN_LED_RED, LOW);
  }
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.println("[WiFi] Reconnecting...");
  WiFi.disconnect(true); delay(500);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int waited = 0;
  while (WiFi.status() != WL_CONNECTED && waited < WIFI_TIMEOUT_SEC) {
    delay(1000); Serial.print("."); waited++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Reconnected — IP: %s\n",
                  WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("[WiFi] Reconnect FAILED");
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 8 — SENSOR FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read BME280 on Wire1.
 * Returns false if any value is NaN or pressure is suspiciously zero.
 */
bool readBME280(float& temp, float& hum, float& pres) {
  float t = bme.readTemperature();
  float h = bme.readHumidity();
  float p = bme.readPressure() / 100.0f;  // Pa → hPa
  if (isnan(t) || isnan(h) || isnan(p) || p < 1.0f) return false;
  temp = t; hum = h; pres = p;
  return true;
}

/**
 * Read MQ-135 AO (GPIO 32) → raw ADC value (0-4095).
 * Averages 10 ADC samples. This is the primary value for backend + model.
 */
int readMQ135ADC() {
  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(PIN_MQ135_AO); delay(5); }
  return (int)constrain((float)sum / 10.0f, 0.0f, 4095.0f);
}

/**
 * Convert ADC value to PPM via Rs/Ro ratio (for display only).
 * Calibrate MQ135_RO_CLEAN in clean air.
 */
float readMQ135PPMfromADC(int adc) {
  float adc_f = (float)adc;
  float vout = (adc_f / 4095.0f) * 3.3f;
  float RS   = ((3.3f - vout) / vout) * MQ135_R_LOAD;
  float ratio = RS / MQ135_RO_CLEAN;
  float ppm   = 116.6020682f * powf(ratio, -2.769034857f);
  return constrain(ppm, 0.0f, 2000.0f);
}

/**
 * Read MQ-135 DO (GPIO 35 — input-only, no internal pull-up).
 * Returns true when alarm fires. Most breakouts are active LOW.
 */
bool readMQ135Alarm() {
  bool pinState = digitalRead(PIN_MQ135_DO);
  return MQ135_ALARM_ACTIVE_LOW ? (pinState == LOW) : (pinState == HIGH);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 9 — JSON BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds JSON matching kondisi_makanan schema.
 *
 *   mq_135      ← MQ-135 ADC (0-4095, raw analog reading from GPIO 32)
 *   mq_136      ← 5.0 ppm static placeholder (MQ-136 not installed)
 *   temperature ← BME280 °C (GPIO 33/25)
 *   humidity    ← BME280 %RH
 *   h2s / voc / amonia ← omitted (optional fields, not measured in prototype)
 *   tvc / rsl_minutes / class ← not included (backend AI calculates)
 */
String buildIngestJSON(float temp, float hum, int mq135_adc, float mq136) {
  JsonDocument doc;  // ArduinoJson v7. For v6: StaticJsonDocument<256> doc;

  doc["mq_135"]      = mq135_adc;  // Raw ADC (integer, 0-4095)
  doc["mq_136"]      = roundf(mq136 * 10000.0f) / 10000.0f;
  doc["temperature"] = roundf(temp  * 100.0f)   / 100.0f;
  doc["humidity"]    = roundf(hum   * 100.0f)   / 100.0f;
  // Optional fields (h2s, voc, amonia) are intentionally omitted as they are null
  String json;
  serializeJson(doc, json);
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 10 — HTTP POST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST to backend REST API.
 * Content-Type: application/json
 * Backend returns 200 OK on success after AI prediction
 */
bool postToBackend(float temp, float hum, int mq135_adc, float mq136) {
  WiFiClient client;
  HTTPClient http;
  Serial.printf("[HTTP] POST → %s\n", ingestEndpoint);

  if (!http.begin(client, ingestEndpoint)) {
    Serial.println("[HTTP] Failed to open connection");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(5000);
  http.setTimeout(12000);  // 12 s — Python AI inference can take a few seconds

  String payload = buildIngestJSON(temp, hum, mq135_adc, mq136);
  Serial.printf("[HTTP] Payload: %s\n", payload.c_str());

  int code = http.POST(payload);
  g_http_code = code;

  bool ok = false;
  if (code > 0) {
    Serial.printf("[HTTP] Response Code: %d\n", code);
    String response = http.getString();
    
    // Backend returns 200 after successful insert + AI prediction
    ok = (code == HTTP_CODE_OK || code == HTTP_CODE_CREATED || code == 204);
    
    if (!ok) {
      Serial.printf("[HTTP] ERROR! Response: %s\n", response.c_str());
    } else {
      Serial.println("[HTTP] Upload SUCCESS");
    }
  } else {
    Serial.printf("[HTTP] Connection Error: %s\n", http.errorToString(code).c_str());
  }

  http.end();
  return ok;
}

/**
 * Check if frontend has requested an upload via backend.
 * Backend stores flag and returns upload_now: true once, then clears it.
 */
bool shouldForceUpload() {
  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, commandEndpoint)) {
    Serial.println("[Command] Failed to open connection");
    return false;
  }

  http.setConnectTimeout(3000);
  http.setTimeout(3000);
  int code = http.GET();
  
  if (code <= 0) {
    Serial.printf("[Command] GET failed: %s\n", http.errorToString(code).c_str());
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();
  
  Serial.printf("[Command] Response (code %d): %s\n", code, body.c_str());

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.printf("[Command] JSON parse error: %s\n", err.c_str());
    return false;
  }

  bool upload_now = doc["upload_now"] | false;
  if (upload_now) {
    Serial.println("[Command] ✓ Upload request received!");
  }
  
  return upload_now;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 11 — LEDs
// ─────────────────────────────────────────────────────────────────────────────

/**
 *  ppm < 200  AND  no DO alarm → GREEN  (Safe)
 *  ppm 200-400  OR  DO alarm   → YELLOW (Warning)
 *  ppm > 400    OR  DO alarm + ppm > 200 → RED (Danger)
 */
void updateLEDs(float mq135, bool alarm) {
  digitalWrite(PIN_LED_GREEN,  LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED,    LOW);

  if (mq135 > 400.0f || (alarm && mq135 > 200.0f)) {
    digitalWrite(PIN_LED_RED, HIGH);
  } else if (mq135 >= 200.0f || alarm) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
  } else {
    digitalWrite(PIN_LED_GREEN, HIGH);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 12 — OLED
// ─────────────────────────────────────────────────────────────────────────────

void updateOLED(float temp, float hum, float pres, float mq135,
                bool alarm, bool upload_ok, int http_code) {
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  oled.setCursor(16, 0);
  oled.println("== FRESH GUARD ==");

  oled.setCursor(0, 10);
  oled.printf("Temp : %6.2f C", temp);

  oled.setCursor(0, 19);
  oled.printf("Hum  : %6.2f %%", hum);

  oled.setCursor(0, 28);
  oled.printf("MQ135: %6.2f ppm", mq135);

  oled.setCursor(0, 37);
  oled.printf("DO   : %s", alarm ? "! ALARM !" : "OK");

  oled.setCursor(0, 46);
  oled.printf("MQ136: %.1f ppm*", g_mq136_ppm);

  oled.setCursor(0, 55);
  if (upload_ok) oled.printf("UP: OK  [%d]", http_code);
  else           oled.printf("UP: FAIL[%d]", http_code);

  oled.display();
}

// =============================================================================
//  END OF FILE
// =============================================================================
