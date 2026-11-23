// ESP32 + RC522: send each scanned card's UID to the server.
// Wiring: SDA->D5, SCK->D18, MOSI->D23, MISO->D19, RST->D22, GND->GND, 3.3V->3V3

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>   // standard MFRC522 library (4 MHz SPI)

const char* WIFI_SSID     = "motoedge60fusion_9739";
const char* WIFI_PASSWORD = "physicsvk1817";
const char* SERVER_URL    = "https://extra-brown.vercel.app/scan";

#define SS_PIN  5
#define RST_PIN 22

MFRC522 rfid(SS_PIN, MFRC522::UNUSED_PIN);   // we drive RST ourselves

void setup() {
  Serial.begin(115200);

  pinMode(RST_PIN, OUTPUT);      // keep RST high, or the RC522 powers itself down
  digitalWrite(RST_PIN, HIGH);
  delay(50);
  SPI.begin();
  rfid.PCD_Init();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi connected. Scan a card...");
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

  WiFiClientSecure client;
  client.setInsecure();          // skip HTTPS certificate check
  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST("{\"uid\":\"" + uid + "\"}");
  Serial.printf("Server replied %d\n", code);
  http.end();
}
