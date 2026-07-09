# Wallets y seeds: la base de la custodia

Una wallet cripto no "guarda" tus monedas como si fueran un archivo: guarda las **claves privadas** que demuestran que vos controlás una dirección en la blockchain. Los fondos siempre viven en la red; la wallet es la llave. Cuando instalás MetaMask, Rainbow o cualquier wallet non-custodial, esa app genera una **seed phrase** (frase semilla) de 12 o 24 palabras siguiendo el estándar BIP-39 — a partir de esas palabras se derivan matemáticamente todas tus claves privadas y direcciones. Quien tenga la seed, tiene control total de los fondos, sin excepción y sin forma de revertirlo.

Por eso la regla más repetida del ecosistema es también la más incumplida: **nunca compartas tu seed phrase con nadie**, nunca la escribas en una web, un formulario, un chat de soporte o un bot de Telegram. Ningún exchange, wallet o proyecto legítimo te la va a pedir jamás — ni para "verificar tu cuenta", ni para "recibir un airdrop", ni para "sincronizar" nada. Todo mensaje que te la pida es un intento de robo. La forma más segura de guardarla es offline: anotada en papel (o grabada en metal) y guardada físicamente, nunca en un archivo de texto, foto del celular, email o gestor de contraseñas conectado a internet.

Una wallet de **hardware** (Ledger, Trezor) lleva esto un paso más allá: la clave privada nunca sale del dispositivo físico, ni siquiera cuando firmás una transacción desde tu computadora. Esto reduce drásticamente el riesgo de malware que lee la memoria del navegador o del sistema operativo, que es el vector de robo más común hoy. Para uso cotidiano con montos chicos, una wallet de software (extensión de navegador o app) conectada por WalletConnect es razonable; para montos grandes o ahorro de largo plazo, hardware wallet es el estándar.

PULSO es un exchange **non-custodial**: cuando conectás tu wallet (vía RainbowKit) para operar en el módulo de Staking, la app nunca ve ni pide tu seed ni tu clave privada — solo pide que firmes transacciones puntuales, que vos aprobás una por una desde tu propia wallet. Toda la demo corre sobre Sepolia, una testnet de Ethereum: los ETH y tokens que usás ahí no tienen valor real, así que es un entorno seguro para practicar sin arriesgar fondos.

<!-- quiz -->
```json
[
  {
    "question": "¿Qué controla realmente una wallet cripto non-custodial?",
    "options": [
      "Un saldo que la empresa de la wallet guarda en sus servidores",
      "Las claves privadas que permiten firmar transacciones sobre una dirección en la blockchain",
      "Una copia de las monedas dentro del propio celular",
      "El historial de precios de cada moneda"
    ],
    "correctIndex": 1,
    "explanation": "Los fondos siempre están en la blockchain; la wallet solo guarda las claves privadas que prueban que vos podés moverlos."
  },
  {
    "question": "¿En qué circunstancia es legítimo que te pidan tu seed phrase de 12/24 palabras?",
    "options": [
      "Para 'verificar' tu cuenta en un exchange",
      "Para recibir un airdrop o promoción especial",
      "En ninguna: ningún servicio legítimo la pide jamás",
      "Cuando te lo pide soporte técnico por chat"
    ],
    "correctIndex": 2,
    "explanation": "La seed phrase nunca se comparte con nadie, bajo ningún pretexto: quien la tiene controla los fondos por completo."
  },
  {
    "question": "¿Cuál es la ventaja principal de una hardware wallet (Ledger, Trezor) frente a una wallet de software?",
    "options": [
      "Es gratis y no requiere backup",
      "La clave privada nunca sale del dispositivo físico, incluso al firmar transacciones",
      "Permite recuperar la seed llamando a soporte",
      "Funciona sin conexión a ninguna blockchain"
    ],
    "correctIndex": 1,
    "explanation": "El aislamiento físico de la clave privada es justamente lo que reduce el riesgo de robo por malware en la computadora."
  },
  {
    "question": "¿Por qué PULSO puede operar sin custodiar los fondos del usuario?",
    "options": [
      "Porque solo opera con montos simbólicos",
      "Porque el usuario firma cada transacción desde su propia wallet conectada; PULSO nunca ve la seed ni la clave privada",
      "Porque todos los usuarios comparten una wallet común de la plataforma",
      "Porque los contratos se pueden pausar en cualquier momento"
    ],
    "correctIndex": 1,
    "explanation": "Ese es el sentido de 'non-custodial': la interfaz arma la transacción, pero la firma final siempre la hace la wallet del usuario."
  }
]
```
