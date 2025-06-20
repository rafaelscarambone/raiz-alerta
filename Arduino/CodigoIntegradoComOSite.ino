#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// UUIDs únicos para o serviço
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Pinos
const int SENSOR1_PIN = 34;
const int SENSOR2_PIN = 35;
const int BUZZER_PIN = 32;

// Calibração
const int SECO = 4095;
const int MOLHADO = 0;

// Variáveis
unsigned long ultimoEnvio = 0;
const unsigned long intervaloEnvio = 1000;

// Callbacks do servidor
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Dispositivo conectado!");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Dispositivo desconectado!");
    }
};

void setup() {
  Serial.begin(115200);
  
  // Configurar pinos
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Criar dispositivo BLE
  BLEDevice::init("ESP32Sensores");
  
  // Criar servidor BLE
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  // Criar serviço BLE
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  // Criar característica BLE
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE
                    );
  
  // Adicionar descritor
  pCharacteristic->addDescriptor(new BLE2902());
  
  // Iniciar serviço
  pService->start();
  
  // Iniciar advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();
  
  Serial.println("Aguardando conexão BLE...");
}

float lerSensor(int pino) {
  int leitura = analogRead(pino);
  float percentual = map(leitura, SECO, MOLHADO, 0, 100);
  percentual = constrain(percentual, 0, 100);
  return percentual;
}

void loop() {
  // Reconectar se necessário
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Reiniciando advertising...");
    oldDeviceConnected = deviceConnected;
  }
  
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
  
  // Enviar dados a cada segundo
  if (deviceConnected && (millis() - ultimoEnvio >= intervaloEnvio)) {
    ultimoEnvio = millis();
    
    // Ler sensores
    float sensor1 = lerSensor(SENSOR1_PIN);
    float sensor2 = lerSensor(SENSOR2_PIN);
    float media = (sensor1 + sensor2) / 2.0;
    bool alerta = media >= 40.0;
    
    // Controlar buzzer
    digitalWrite(BUZZER_PIN, alerta ? HIGH : LOW);
    
    // Criar string de dados
    String dados = String(sensor1, 1) + "," + 
                   String(sensor2, 1) + "," + 
                   String(media, 1) + "," + 
                   String(alerta ? 1 : 0);
    
    // Enviar via BLE
    pCharacteristic->setValue(dados.c_str());
    pCharacteristic->notify();
    
    Serial.println("Dados enviados: " + dados);
  }
  
  delay(10);
}