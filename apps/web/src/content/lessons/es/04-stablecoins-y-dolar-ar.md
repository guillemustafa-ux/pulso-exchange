# Stablecoins y el dólar en Argentina

Una stablecoin es un token cripto diseñado para mantener un valor estable, generalmente atado 1 a 1 al dólar estadounidense. Las dos más usadas son **USDT** (Tether) y **USDC** (Circle): ambas dicen mantener reservas equivalentes en dólares y activos líquidos por cada token emitido, y publican reportes de reservas periódicos, aunque con distinto nivel de transparencia y auditoría entre una y otra. Existen también stablecoins algorítmicas, que intentan mantener el peg con mecanismos de mercado en vez de reservas — el ejemplo más recordado es el colapso de **UST/Luna en mayo de 2022**, que perdió su paridad con el dólar en cuestión de días y borró decenas de miles de millones de dólares, una lección central sobre por qué el diseño del respaldo importa tanto como el nombre "stablecoin".

En Argentina, las stablecoins cumplieron un rol muy concreto: con el cepo cambiario limitando el acceso al dólar oficial y una brecha histórica entre el dólar oficial, el MEP, el CCL y el "blue", comprar USDT se volvió, para mucha gente, la forma más simple de dolarizarse sin pasar por el sistema bancario tradicional ni sus límites operativos. Esto explica por qué el volumen de operaciones P2P con USDT en Argentina está entre los más altos de la región: no es especulación, es una respuesta directa a la necesidad de ahorrar en una moneda que no pierda poder adquisitivo frente a la inflación del peso.

Pero "estable" no significa "sin riesgo". Incluso USDC, considerada de las más sólidas, perdió brevemente su paridad en marzo de 2023 cuando parte de sus reservas quedaron atrapadas en el colapso del Silicon Valley Bank — volvió a 1:1 en pocos días, pero mostró que el riesgo de contraparte (dónde y cómo están guardadas las reservas) es real incluso en las stablecoins más grandes. Comprar USDT o USDC en un exchange no regulado, o guardarlos en una wallet sin las precauciones básicas de seguridad, agrega otra capa de riesgo que no tiene que ver con la moneda en sí sino con dónde la tenés.

El módulo Earn AR de PULSO compara justamente estas opciones para el ahorro en Argentina: rendimientos en ARS y en USDT/USDC ofrecidos por exchanges argentinos, fintechs y protocolos DeFi, junto a las cotizaciones de referencia (dólar MEP, CCL, USDT/ARS) para que la comparación sea contra el costo real de dolarizarse, no contra un número aislado.

<!-- quiz -->
```json
[
  {
    "question": "¿Qué intenta lograr una stablecoin como USDT o USDC?",
    "options": [
      "Aumentar de precio constantemente",
      "Mantener un valor estable, generalmente atado 1 a 1 al dólar estadounidense",
      "Reemplazar completamente al sistema bancario",
      "Funcionar solo dentro de una blockchain específica"
    ],
    "correctIndex": 1,
    "explanation": "El objetivo central de una stablecoin es minimizar la volatilidad manteniendo paridad con un activo de referencia, típicamente el dólar."
  },
  {
    "question": "¿Qué mostró el colapso de UST/Luna en mayo de 2022?",
    "options": [
      "Que todas las stablecoins son igual de seguras",
      "Que una stablecoin algorítmica sin respaldo sólido puede perder su paridad completamente en días",
      "Que el dólar oficial argentino es más estable que cualquier cripto",
      "Que USDT también colapsó ese mes"
    ],
    "correctIndex": 1,
    "explanation": "UST intentaba mantener el peg con mecanismos de mercado en vez de reservas reales, y ese diseño falló catastróficamente."
  },
  {
    "question": "¿Por qué las stablecoins se volvieron populares para el ahorro en Argentina?",
    "options": [
      "Porque el gobierno las recomienda oficialmente",
      "Porque, con el cepo cambiario y la brecha cambiaria, ofrecen una forma accesible de dolarizarse ante la inflación del peso",
      "Porque no tienen ningún riesgo asociado",
      "Porque rinden más que cualquier plazo fijo en pesos"
    ],
    "correctIndex": 1,
    "explanation": "El uso masivo de USDT en Argentina responde a una necesidad concreta de acceso al dólar, no a especulación."
  },
  {
    "question": "¿Qué pasó con USDC en marzo de 2023?",
    "options": [
      "Perdió su paridad para siempre",
      "Perdió brevemente su paridad al quedar parte de sus reservas expuestas al colapso de Silicon Valley Bank, y la recuperó en días",
      "Dejó de existir",
      "Subió de precio por encima de 1 dólar de forma permanente"
    ],
    "correctIndex": 1,
    "explanation": "El caso mostró que el riesgo de contraparte (dónde están las reservas) es real incluso en stablecoins consideradas sólidas."
  }
]
```
