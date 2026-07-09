# Riesgos de DeFi: lo que el APY no te cuenta

DeFi (finanzas descentralizadas) promete rendimientos que a veces parecen mágicos comparados con una caja de ahorro tradicional, pero ese rendimiento viene acompañado de riesgos que no existen en las finanzas tradicionales — y que rara vez se explican junto al número de APY. El más citado es la **pérdida impermanente** (impermanent loss): cuando proveés liquidez a un pool de dos tokens (ej. ETH/USDC), si el precio de uno se mueve mucho respecto al otro, terminás con menos valor total que si simplemente hubieras mantenido ambos tokens por separado en tu wallet. No es una pérdida "de mentira": se vuelve permanente en el momento en que retirás la liquidez con esa diferencia de precio todavía vigente.

Otro riesgo central son los **rug pulls**: un equipo lanza un protocolo o token, atrae liquidez y TVL con un APY llamativo, y luego retira toda la liquidez del pool (o usa una función oculta del contrato para vaciarlo), dejando a los usuarios con tokens que no valen nada. Una señal de alerta clásica es la falta de **timelock** en las funciones administrativas del contrato: si el equipo puede cambiar reglas o retirar fondos de forma instantánea y sin aviso previo, el riesgo de rug pull es mucho más alto, sin importar cuánto marketing tenga el proyecto.

El riesgo técnico también es real incluso en protocolos "serios": los **exploits de smart contracts** siguen ocurriendo en 2025-2026 pese a las auditorías — casos como el hackeo a Euler Finance (2023, ~200M USD, luego recuperado tras negociar con el atacante) muestran que una auditoría reduce el riesgo pero no lo elimina. Los ataques de **flash loans** (pedir prestado un monto enorme sin garantía, manipular el precio de un oráculo en la misma transacción, y devolver el préstamo) y la **manipulación de oráculos** siguen siendo los vectores más comunes de robos grandes en DeFi. Un TVL (Total Value Locked) alto tampoco es garantía de seguridad: solo indica cuánto dinero hay depositado, no qué tan bien protegido está.

El módulo DeFi de PULSO existe justamente para comparar protocolos con esta mirada crítica: mostrar APY junto a señales de riesgo (auditorías, tiempo en producción, TVL) en vez de mostrar solo el número más grande. La regla general al evaluar cualquier protocolo: desconfiar de rendimientos muy por encima del promedio del mercado, revisar si el contrato está verificado y auditado, y nunca poner en un solo protocolo más de lo que estás dispuesto a perder por completo.

<!-- quiz -->
```json
[
  {
    "question": "¿Qué es la 'pérdida impermanente' (impermanent loss)?",
    "options": [
      "Una comisión fija que cobra cada pool de liquidez",
      "La diferencia de valor que sufre un proveedor de liquidez cuando los precios de los dos tokens del pool se separan, comparado con haberlos mantenido por separado",
      "Un impuesto que se paga al gobierno por operar en DeFi",
      "La pérdida que ocurre solo si el protocolo es hackeado"
    ],
    "correctIndex": 1,
    "explanation": "Impermanent loss es un efecto matemático de cómo funcionan los pools AMM, no un hackeo ni una comisión."
  },
  {
    "question": "¿Cuál es una señal de alerta de posible 'rug pull' en un protocolo DeFi?",
    "options": [
      "Que el contrato esté verificado en el explorer",
      "Que el equipo pueda retirar fondos o cambiar reglas de forma instantánea, sin timelock ni aviso previo",
      "Que el TVL sea muy alto",
      "Que tenga una auditoría pública"
    ],
    "correctIndex": 1,
    "explanation": "La falta de timelock en funciones administrativas es una de las señales más claras de riesgo de rug pull."
  },
  {
    "question": "¿Qué demuestra el caso de Euler Finance (2023, exploit de ~200M USD)?",
    "options": [
      "Que los protocolos auditados nunca pueden ser hackeados",
      "Que una auditoría reduce el riesgo pero no lo elimina por completo",
      "Que DeFi no tiene ningún riesgo técnico real",
      "Que el TVL alto previene los exploits"
    ],
    "correctIndex": 1,
    "explanation": "Euler estaba auditado y aun así sufrió un exploit grave, mostrando que ninguna auditoría es una garantía absoluta."
  },
  {
    "question": "¿Qué mide realmente el TVL (Total Value Locked) de un protocolo?",
    "options": [
      "Qué tan seguro es el contrato",
      "Cuánto dinero hay depositado en el protocolo, sin decir nada sobre su seguridad",
      "El rendimiento anual garantizado",
      "La cantidad de auditorías que tuvo"
    ],
    "correctIndex": 1,
    "explanation": "TVL es solo un indicador de tamaño/popularidad, no de qué tan bien protegido está el protocolo contra exploits."
  }
]
```
