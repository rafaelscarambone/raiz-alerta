#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <string>   // Necessário para std::string
#include <stdexcept> // Necessário para std::stof e exceções

// UUIDs únicos para o serviço
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
// UUID da característica de dados de sensores
#define DATA_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
// UUID da característica para configurar o limite de umidade 'Alerta' (era 'Muito Seco')
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

// Limiares de Umidade Configuráveis (Valores Iniciais)
// O alarme dispara se a umidade for menor que alertaThreshold ou maior que umidoThreshold
float alertaThreshold = 60.0; // Limiar para "Alerta" (%)
float umidoThreshold = 80.0; // Limiar para "Muito Úmido" (%)


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
      // Reinicia a publicidade após um pequeno delay
      delay(500); // Delay para permitir que o cliente se desconecte totalmente
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
                      BLECharacteristic::PROPERTY_WRITE  | // Mantido WRITE, embora não usado no seu loop atual
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE // Indicate é mais confiável que notify
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
  // Define o valor inicial na característica para que possa ser lido pelo cliente
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

    // === Lógica de Alerta Modificada ===
    // O alerta é true se a média estiver abaixo do limiar de alerta OU acima do limiar de muito úmido
    bool alerta = (media < alertaThreshold || media > umidoThreshold);

    // Controlar buzzer com base na lógica de alerta
    digitalWrite(BUZZER_PIN, alerta ? HIGH : LOW);

    // Criar string de dados a ser enviada via BLE
    // Formato: UmidadeSensor1,UmidadeSensor2,Media,StatusAlerta(0=Normal, 1=Alerta)
    String dados = String(sensor1, 1) + "," +
                   String(sensor2, 1) + "," +
                   String(media, 1) + "," +
                   String(alerta ? 1 : 0); // 1 se estiver em alerta, 0 caso contrário

    // Enviar via BLE usando a característica de dados
    pDataCharacteristic->setValue(dados.c_str());
    // Usar notify para enviar dados para clientes inscritos
    // Se INDICATE estivesse sendo usado, seria pDataCharacteristic->indicate();
    pDataCharacteristic->notify();

    Serial.println("Dados enviados: " + dados);
    Serial.printf("Limiares atuais: Alerta=%.1f%%, Muito Úmido=%.1f%%\n", alertaThreshold, umidoThreshold);
  }

  // Pequeno delay para o loop não rodar excessivamente rápido
  delay(10);
}