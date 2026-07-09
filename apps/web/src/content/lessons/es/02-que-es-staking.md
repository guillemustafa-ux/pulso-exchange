# Qué es el staking

El staking es el mecanismo de seguridad de las blockchains que usan **Proof of Stake** (Prueba de Participación), el modelo que adoptó Ethereum en 2022 (The Merge) y que usan también Solana, Cardano o Polkadot, entre otras. En vez de "minar" bloques gastando energía (Proof of Work, como Bitcoin), los validadores **bloquean una cantidad de tokens como garantía** y, a cambio de proponer y validar bloques honestamente, reciben una recompensa. Si un validador intenta hacer trampa (validar transacciones inválidas, estar offline de forma prolongada), la red le puede quitar parte de esos tokens bloqueados — esto se llama **slashing** y es el incentivo económico que mantiene la red segura.

No hace falta correr un validador propio (que en Ethereum requiere 32 ETH y una computadora corriendo 24/7) para participar: existen dos caminos más accesibles. El **delegated staking** deja tu token bloqueado en un contrato que un validador opera por vos, cobrando una comisión. El **liquid staking** (como Lido con stETH) va un paso más allá: te da un token líquido que representa tu posición staked, que podés seguir usando en DeFi mientras sigue generando rendimiento. Cada modelo tiene trade-offs distintos entre control, liquidez y confianza en un tercero.

El riesgo de staking no es solo el slashing del validador: también existe el **riesgo del smart contract** que gestiona el staking (un bug o exploit puede comprometer los fondos bloqueados, sin importar qué tan honesto sea el validador), y el **riesgo de lock-up**: muchos protocolos exigen un período de espera (cooldown) para retirar, durante el cual no podés vender aunque el precio caiga. El APY que ves anunciado tampoco es garantizado: varía con la cantidad total de tokens en staking en toda la red y con la actividad de la cadena.

El módulo de Staking de PULSO usa el contrato `PulsoStaking`, desplegado y verificado en Sepolia (testnet de Ethereum), que recibe `PulsoToken` en staking y calcula recompensas de forma transparente y auditable en el código del contrato — podés leer exactamente cómo se calcula el rendimiento en vez de confiar en un número que te muestra una interfaz. Como toda la demo corre en testnet, sirve para practicar el flujo completo (aprobar, stakear, esperar, retirar) sin arriesgar valor real.

<!-- quiz -->
```json
[
  {
    "question": "¿Qué reemplaza el staking (Proof of Stake) respecto al minado (Proof of Work)?",
    "options": [
      "El gasto de energía computacional por bloquear tokens como garantía económica",
      "La necesidad de tener una wallet",
      "El uso de contratos inteligentes",
      "La existencia de comisiones de red"
    ],
    "correctIndex": 0,
    "explanation": "En Proof of Stake la seguridad se garantiza económicamente (tokens en juego) en vez de con cómputo (minería)."
  },
  {
    "question": "¿Qué es el 'slashing'?",
    "options": [
      "Una comisión que cobra el exchange por stakear",
      "La penalización que pierde un validador que actúa deshonesto o está offline",
      "El impuesto que cobra el gobierno sobre las recompensas",
      "El límite máximo de tokens que se pueden stakear"
    ],
    "correctIndex": 1,
    "explanation": "El slashing es el castigo económico que mantiene incentivados a los validadores a comportarse honestamente."
  },
  {
    "question": "¿Cuál es una diferencia clave del liquid staking (ej. stETH de Lido) frente al staking tradicional?",
    "options": [
      "No tiene ningún riesgo asociado",
      "Te entrega un token líquido que podés seguir usando en DeFi mientras tu posición sigue generando rendimiento",
      "Garantiza que nunca vas a sufrir slashing",
      "Requiere menos de 1 token para participar"
    ],
    "correctIndex": 1,
    "explanation": "El liquid staking resuelve el problema de 'liquidez congelada' emitiendo un token derivado que representa tu posición staked."
  },
  {
    "question": "Además del riesgo del validador, ¿qué otro riesgo importante existe al stakear en un protocolo DeFi?",
    "options": [
      "Ninguno, si el APY es alto",
      "El riesgo del smart contract que gestiona el staking, que puede tener bugs o ser explotado",
      "El riesgo de que el token deje de existir físicamente",
      "El riesgo de que el navegador se cierre"
    ],
    "correctIndex": 1,
    "explanation": "Un contrato de staking mal auditado puede perder los fondos bloqueados aunque los validadores se comporten perfectamente bien."
  }
]
```
