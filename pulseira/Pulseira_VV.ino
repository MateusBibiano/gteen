/*
  Pulseira vibratória do professor — Solução da Equipe GTEeN
  Placa: ESP32-C3 (ex.: ESP32-C3 Super Mini)

  Protocolo Bluetooth (o mesmo do pulseira.py e do painel no navegador):
  - nome "Pulseira-VV", serviço 7a0b1000-..., característica 7a0b1001-...
  - escrever 1 byte de 1 a 9  -> vibra esse número de vezes
  - escrever 100 + P          -> passa a usar o pino P para o motor
                                 (fica salvo) e vibra 1 vez nele
  - escrever 0                -> não faz nada (teste de conexão)

  Segurança: ao ligar, TODOS os pinos que podem ter o motor ficam em
  nível baixo (desligado). Nenhum pino fica "solto", então o motor só
  vibra quando um pedido chega.
*/
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <Preferences.h>

#define NOME_BLE  "Pulseira-VV"
#define SERVICO   "7a0b1000-5c1e-4b7a-9f3e-0d2a6c8e4f10"
#define CARAC     "7a0b1001-5c1e-4b7a-9f3e-0d2a6c8e4f10"

const int PINO_PADRAO = 3;      // usado até o painel escolher outro
const int VIBRA_MS    = 300;
const int PAUSA_MS    = 200;
// pinos seguros da ESP32-C3 para o motor (sem os de boot e USB)
const int PINOS_OK[] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 20, 21};

Preferences prefs;
int pinoMotor = PINO_PADRAO;
volatile int pedido = 0;
volatile int novoPino = -1;
volatile bool conectada = false;

bool pinoValido(int p) {
  for (int x : PINOS_OK) if (x == p) return true;
  return false;
}

class EventosServidor : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override { conectada = true; Serial.println("Conectada"); }
  void onDisconnect(BLEServer* s) override {
    conectada = false;
    Serial.println("Desconectada, anunciando de novo");
    BLEDevice::startAdvertising();
  }
};

class EventosCaracteristica : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    auto valor = c->getValue();
    if (valor.length() == 0) return;
    int b = (uint8_t)valor[0];
    if (b >= 1 && b <= 9) pedido = b;
    else if (b >= 100 && pinoValido(b - 100)) novoPino = b - 100;
  }
};

void vibrar(int vezes) {
  vezes = constrain(vezes, 1, 9);
  for (int i = 0; i < vezes; i++) {
    digitalWrite(pinoMotor, HIGH);
    delay(VIBRA_MS);
    digitalWrite(pinoMotor, LOW);
    if (i < vezes - 1) delay(PAUSA_MS);
  }
}

void desligarTodos() {
  for (int x : PINOS_OK) { pinMode(x, OUTPUT); digitalWrite(x, LOW); }
}

void usarPino(int p) {
  digitalWrite(pinoMotor, LOW);       // o pino anterior continua em nível baixo
  pinoMotor = p;
  pinMode(pinoMotor, OUTPUT);
  digitalWrite(pinoMotor, LOW);
}

void setup() {
  desligarTodos();                    // primeiro de tudo: motor parado
  Serial.begin(115200);
  prefs.begin("pulseira", false);
  int salvo = prefs.getInt("pino", PINO_PADRAO);
  pinoMotor = pinoValido(salvo) ? salvo : PINO_PADRAO;
  pinMode(pinoMotor, OUTPUT);
  digitalWrite(pinoMotor, LOW);

  BLEDevice::init(NOME_BLE);
  BLEServer* servidor = BLEDevice::createServer();
  servidor->setCallbacks(new EventosServidor());
  BLEService* servico = servidor->createService(SERVICO);
  BLECharacteristic* carac = servico->createCharacteristic(
    CARAC, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  carac->setCallbacks(new EventosCaracteristica());
  servico->start();

  BLEAdvertising* anuncio = BLEDevice::getAdvertising();
  anuncio->addServiceUUID(SERVICO);
  anuncio->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.printf("Pulseira-VV anunciando. Pino do motor: %d\n", pinoMotor);
  vibrar(1);
}

void loop() {
  if (novoPino >= 0) {
    int p = novoPino; novoPino = -1;
    usarPino(p);
    prefs.putInt("pino", p);
    Serial.printf("Pino do motor agora: %d\n", p);
    vibrar(1);
  }
  if (pedido > 0) {
    int n = pedido; pedido = 0;
    vibrar(n);
  }
  delay(10);
}
