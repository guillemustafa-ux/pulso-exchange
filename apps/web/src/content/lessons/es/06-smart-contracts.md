# Qué es un smart contract

Un smart contract (contrato inteligente) es un programa que corre dentro de una blockchain — en el caso de Ethereum y redes compatibles (como Sepolia, la testnet que usa PULSO), en la **EVM** (Ethereum Virtual Machine). No es un "contrato legal" en sentido tradicional: es código, generalmente escrito en Solidity, que ejecuta exactamente lo que dice, sin intermediarios ni margen de interpretación humana. Si el código dice que al enviar X tokens se te acredita Y, eso va a pasar siempre igual, sin importar quién lo ejecute — esa es la garantía central: **ejecución determinista y sin intermediarios**.

Una propiedad clave (y también uno de los mayores riesgos) es la **inmutabilidad**: una vez desplegado en la red, el código de un contrato normalmente no se puede modificar. Esto es una ventaja de seguridad (nadie puede cambiar las reglas después de que confiaste en ellas) pero también significa que un bug desplegado es un bug permanente, salvo que el equipo haya diseñado el contrato con un patrón de actualización (proxy upgradeable) desde el principio — lo cual, a su vez, reintroduce un punto de confianza en quien controla esa actualización. Cada interacción con un contrato cuesta **gas**: una comisión en la moneda nativa de la red (ETH en Ethereum) que paga el cómputo que consume esa transacción, y que varía según cuánta demanda hay por espacio en los bloques.

Los estándares son lo que permite que distintos contratos se entiendan entre sí sin conocerse de antemano: **ERC-20** define cómo debe comportarse un token fungible (transferencias, balances, aprobaciones) y es la base de la enorme mayoría de tokens cripto, incluido `PulsoToken`. Estándares más nuevos como **ERC-4626** estandarizan cómo debe comportarse una "vault" (bóveda de rendimiento), facilitando que protocolos de staking, préstamos o yield farming se integren entre sí de forma predecible.

Antes de interactuar con cualquier contrato — aprobar un gasto, depositar fondos — conviene verificar que el código esté **verificado y publicado** en un explorer como Etherscan, para poder leer exactamente qué hace, en vez de confiar ciegamente en una interfaz. Los contratos de PULSO, `PulsoToken` (`0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75`) y `PulsoStaking` (`0x6006EA579603439e22fb090bD5233f1f6fba06df`), están desplegados y verificados en Sepolia: cualquiera puede leer su código fuente público y confirmar exactamente qué hace cada función antes de usarlas.

<!-- quiz -->
```json
[
  {
    "question": "¿Qué es un smart contract en esencia?",
    "options": [
      "Un documento legal firmado digitalmente por un abogado",
      "Un programa que corre en la blockchain (ej. en la EVM) y ejecuta exactamente lo que dice su código, sin intermediarios",
      "Un archivo PDF almacenado en IPFS",
      "Una cuenta bancaria digital regulada"
    ],
    "correctIndex": 1,
    "explanation": "Un smart contract es código ejecutado de forma determinista por la red, no un documento legal tradicional."
  },
  {
    "question": "¿Qué implica la inmutabilidad de un contrato desplegado sin patrón de actualización?",
    "options": [
      "Que se puede corregir cualquier bug apenas se detecta",
      "Que un bug desplegado queda permanente, porque el código ya no se puede modificar",
      "Que el contrato deja de funcionar después de un año",
      "Que solo el creador puede usarlo"
    ],
    "correctIndex": 1,
    "explanation": "La inmutabilidad da seguridad frente a cambios de reglas no consentidos, pero también vuelve permanente cualquier error de código."
  },
  {
    "question": "¿Para qué sirve el estándar ERC-20?",
    "options": [
      "Para definir cómo debe comportarse un token fungible (transferencias, balances, aprobaciones)",
      "Para fijar el precio de un token",
      "Para garantizar que un contrato nunca tenga bugs",
      "Para eliminar el pago de gas"
    ],
    "correctIndex": 0,
    "explanation": "ERC-20 es el estándar que permite que wallets, exchanges y otros contratos interactúen con un token de forma predecible."
  },
  {
    "question": "¿Por qué conviene revisar que un contrato esté verificado en un explorer antes de interactuar con él?",
    "options": [
      "Porque así el gas es gratis",
      "Porque permite leer el código fuente real y confirmar qué hace cada función, en vez de confiar ciegamente en una interfaz",
      "Porque es un requisito legal en todos los países",
      "Porque cambia el estándar del token automáticamente"
    ],
    "correctIndex": 1,
    "explanation": "Un contrato verificado expone su código fuente públicamente, lo que permite auditar su comportamiento antes de usarlo."
  }
]
```
