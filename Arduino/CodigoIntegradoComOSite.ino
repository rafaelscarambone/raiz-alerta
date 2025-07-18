#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <string>   
#include <stdexcept> 

// UUIDs únicos para o serviço
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
// UUID da característica de dados de sensores
#define DATA_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
// UUID da característica para configurar o limite de umidade 'Alerta'
#define ALERTA_THRESHOLD_CHARACTERISTIC_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914c" // Novo UUID
// UUID da característica para configurar o limite de umidade 'Muito Úmido'
#define UMIDO_THRESHOLD_CHARACTERISTIC_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914d" // Mantido


BLEServer* pServer = NULL;
BLECharacteristic* pDataCharacteristic = NULL; // Renomeado para clareza
BLECharacteristic* pAlertaThresholdCharacteristic = NULL; // Nova característica (era pSecoThresholdCharacteristic)
BLECharacteristic* pUmidoThresholdCharacteristic = NULL; // Mantido

bool deviceConnected = false;
bool oldDeviceConnected = false;

// Pinos
const int SENSOR1_PIN = 34;
const int SENSOR2_PIN = 35;
const int BUZZER_PIN = 32;

// Calibração (ainda usados para mapeamento ADC para percentual)
const int SECO_ADC = 4095;
const int MOLHADO_ADC = 0;

// Valores Iniciais
float alertaThreshold = 60.0; // Limitar para "Alerta" (%)
float umidoThreshold = 80.0; // Limitar para "Muito Úmido" (%)


// Variáveis de tempo para envio de dados
unsigned long ultimoEnvio = 0;
const unsigned long intervaloEnvio = 1000; // Enviar a cada 1 segundo

// Callbacks do servidor BLE
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Dispositivo conectado!");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Dispositivo desconectado!");
      delay(500); // Delay
      pServer->startAdvertising();
      Serial.println("Reiniciando advertising...");
    }
};

// Callbacks para escrita nas características de limiares
class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string value = pCharacteristic->getValue().c_str();
        if (value.length() > 0) {
            try {
                float newThreshold = std::stof(value);
                // Verifica qual característica foi escrita
                if (pCharacteristic->getUUID().equals(BLEUUID(ALERTA_THRESHOLD_CHARACTERISTIC_UUID))) {
                    // Característica de Limite Alerta
                    // Valida o novo valor: entre 0 e 100 e menor que o limite muito úmido
                    if (newThreshold >= 0.0 && newThreshold <= 100.0 && newThreshold < umidoThreshold) {
                        alertaThreshold = newThreshold;
                        Serial.printf("Limite Alerta atualizado para: %.1f%%\n", alertaThreshold);
                        pCharacteristic->setValue(String(alertaThreshold).c_str());
                        pCharacteristic->notify();
                    } else {
                        Serial.println("Valor inválido para Limite Alerta recebido. Mantendo valor anterior.");
                        pCharacteristic->setValue(String(alertaThreshold).c_str());
                        pCharacteristic->notify();
                    }
                } else if (pCharacteristic->getUUID().equals(BLEUUID(UMIDO_THRESHOLD_CHARACTERISTIC_UUID))) {
                    // Característica de Limite Muito Úmido
                    // Valida o novo valor: entre 0 e 100 e maior que o limite alerta
                    if (newThreshold >= 0.0 && newThreshold <= 100.0 && newThreshold > alertaThreshold) {
                        umidoThreshold = newThreshold;
                        Serial.printf("Limite Muito Úmido atualizado para: %.1f%%\n", umidoThreshold);
                        pCharacteristic->setValue(String(umidoThreshold).c_str());
                        pCharacteristic->notify();
                    } else {
                        Serial.println("Valor inválido para Limite Muito Úmido recebido. Mantendo valor anterior.");
                        pCharacteristic->setValue(String(umidoThreshold).c_str());
                        pCharacteristic->notify();
                    }
                }
            } catch (const std::invalid_argument& ia) {
                Serial.println("Erro ao converter valor de string para float.");
            } catch (const std::out_of_range& oor) {
                Serial.println("Valor de string fora do intervalo para float.");
            } catch (...) {
                Serial.println("Erro desconhecido ao processar a escrita BLE.");
            }
        }
    }
};


void setup() {
  Serial.begin(115200);

  // Configurar pino do buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW); // Garante que o buzzer começa desligado

  // Criar dispositivo BLE
  BLEDevice::init("ESP32Sensores"); // Nome do dispositivo BLE

  // Criar servidor BLE
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Criar serviço BLE
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Criar característica BLE para dados dos sensores
  pDataCharacteristic = pService->createCharacteristic(
                      DATA_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  | 
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE 
                    );
  pDataCharacteristic->addDescriptor(new BLE2902());

  // Criar característica BLE para configurar o Limite Alerta
  pAlertaThresholdCharacteristic = pService->createCharacteristic(
                      ALERTA_THRESHOLD_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE
                    );
  pAlertaThresholdCharacteristic->addDescriptor(new BLE2902());
  pAlertaThresholdCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
  pAlertaThresholdCharacteristic->setValue(String(alertaThreshold).c_str());


  // Criar característica BLE para configurar o Limite Muito Úmido
  pUmidoThresholdCharacteristic = pService->createCharacteristic(
                      UMIDO_THRESHOLD_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE
                    );
  pUmidoThresholdCharacteristic->addDescriptor(new BLE2902());
  pUmidoThresholdCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
  pUmidoThresholdCharacteristic->setValue(String(umidoThreshold).c_str());


  // Iniciar serviço
  pService->start();

  // Iniciar advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false); // Pode ser true se quiser mais informações no scan
  pAdvertising->setMinPreferred(0x0);    // Permite qualquer intervalo de conexão
  BLEDevice::startAdvertising();

  Serial.println("Aguardando conexão BLE...");
}

// Função para ler o sensor e retornar o percentual de umidade
float lerSensor(int pino) {
  int leitura = analogRead(pino);
  // Mapeia o valor lido (ADC) para um percentual (0-100)
  // Considera SECO_ADC o valor lido no solo seco (máximo ADC) e MOLHADO_ADC no solo molhado (mínimo ADC)
  float percentual = map(leitura, SECO_ADC, MOLHADO_ADC, 0, 100);
  // Garante que o percentual esteja entre 0 e 100
  percentual = constrain(percentual, 0.0, 100.0);
  return percentual;
}

void loop() {
  // Atualiza o estado da conexão
  if (deviceConnected && !oldDeviceConnected) {
    // Dispositivo acabou de conectar
    oldDeviceConnected = deviceConnected;
  } else if (!deviceConnected && oldDeviceConnected) {
    // Dispositivo acabou de desconectar
    oldDeviceConnected = deviceConnected;
    // A reconexão é gerenciada no callback onDisconnect agora
  }

  // Enviar dados a cada 'intervaloEnvio' se houver um dispositivo conectado
  if (deviceConnected && (millis() - ultimoEnvio >= intervaloEnvio)) {
    ultimoEnvio = millis();

    // Ler sensores
    float sensor1 = lerSensor(SENSOR1_PIN);
    float sensor2 = lerSensor(SENSOR2_PIN);
    float media = (sensor1 + sensor2) / 2.0;

    // Determina o status baseado nos limiares
    int status = 0; // 0 = Normal, 1 = Alerta, 2 = Alto Risco
    if (media > umidoThreshold) {
      status = 2; // Alto Risco
    } else if (media >= alertaThreshold) {
      status = 1; // Alerta
    }
    
    // O buzzer só toca em Alto Risco
    digitalWrite(BUZZER_PIN, status == 2 ? HIGH : LOW);

    // Criar string de dados a ser enviada via BLE
    String dados = String(sensor1, 1) + "," +
                   String(sensor2, 1) + "," +
                   String(media, 1) + "," +
                   String(status); // Envia o código de status

    // Enviar via BLE usando a característica de dados
    pDataCharacteristic->setValue(dados.c_str());
    // Se INDICATE estivesse sendo usado, seria pDataCharacteristic->indicate();
    pDataCharacteristic->notify();

    Serial.println("Dados enviados: " + dados);
    Serial.printf("Limiares atuais: Alerta=%.1f%%, Muito Úmido=%.1f%%\n", alertaThreshold, umidoThreshold);
  }

  delay(10);
}