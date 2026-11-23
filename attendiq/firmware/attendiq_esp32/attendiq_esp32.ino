// AttendIQ: ESP32 + RC522 -> POST card UID to the backend with a device key.
// Wiring: SDA->D5, SCK->D18, MOSI->D23, MISO->D19, RST->D22, GND->GND, 3.3V->3V3
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>

// ---- EDIT THESE (do not commit real values) ----
const char* WIFI_SSID    = "motoedge60fusion_9739";
const char* WIFI_PASS    = "physicsvk1817";
const char* SERVER_URL   = "https://attendiq-puce.vercel.app/api/device/scan";
const char* DEVICE_KEY   = "this-project-is-belonging-to-sneha"; 

#define SS_PIN 5
#define RST_PIN 22
MFRC522 rfid(SS_PIN, MFRC522::UNUSED_PIN);

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 15000) delay(250);
}

void setup() {
  Serial.begin(115200);
  pinMode(RST_PIN, OUTPUT); digitalWrite(RST_PIN, HIGH); delay(50);
  SPI.begin(); rfid.PCD_Init();
  ensureWifi();
  Serial.print("WiFi "); Serial.print(WiFi.status() == WL_CONNECTED ? "connected, IP " : "NOT connected ");
  Serial.println(WiFi.localIP());
  Serial.print("Server: "); Serial.println(SERVER_URL);
  Serial.println("Ready. Scan a card...");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) uid += ":";
  }
  uid.toUpperCase();
  rfid.PICC_HaltA();
  Serial.println("Card: " + uid);

  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) { Serial.println("No WiFi"); return; }
  HTTPClient http;
  WiFiClient plain;
  WiFiClientSecure secure;
  if (String(SERVER_URL).startsWith("https://")) {
    secure.setInsecure();  // use a pinned CA cert in production
    http.begin(secure, SERVER_URL);
  } else {
    http.begin(plain, SERVER_URL);  // local http testing
  }
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);
  int code = http.POST("{\"uid\":\"" + uid + "\"}");
  Serial.printf("HTTP %d: %s\n", code, http.getString().c_str());
  http.end();
  delay(1500);  // debounce repeat taps
}
