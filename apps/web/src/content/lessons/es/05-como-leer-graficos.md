# Cómo leer gráficos de precio

Los gráficos de velas (candlesticks) son el estándar para visualizar precios en mercados cripto, y también los que usa PULSO en el módulo Mercado (con la librería lightweight-charts). Cada vela representa un período de tiempo fijo (1 minuto, 1 hora, 1 día — el "timeframe") y muestra cuatro datos: el precio de **apertura** y **cierre** de ese período (el cuerpo de la vela, verde si cerró arriba de donde abrió, rojo si cerró abajo), y el precio **máximo** y **mínimo** alcanzados (las mechas o "wicks" arriba y abajo del cuerpo). Leer una sola vela te dice poco; leer la secuencia de velas y cómo se comportan en distintos timeframes es lo que empieza a dar información útil.

Dos conceptos aparecen en casi cualquier análisis: **soporte** y **resistencia**. Un soporte es un nivel de precio donde, históricamente, la demanda de compra frenó una caída; una resistencia es el nivel inverso, donde la presión de venta frenó una subida. No son líneas mágicas ni matemáticamente exactas — son zonas donde muchos participantes del mercado tienden a reaccionar de forma parecida, por eso funcionan como referencia, no como garantía. El **volumen** (cuánto se operó en cada período) es igual de importante que el precio: un movimiento de precio con volumen bajo dice mucho menos que el mismo movimiento con volumen alto, porque refleja cuánta convicción real hay detrás del movimiento.

Los indicadores técnicos más comunes son promedios y osciladores construidos sobre el precio: las **medias móviles** (SMA, EMA) suavizan el ruido de corto plazo para mostrar la tendencia de fondo, y el cruce entre una media corta y una larga se usa a veces como señal de cambio de tendencia. El **RSI** (Relative Strength Index) mide si un activo está "sobrecomprado" o "sobrevendido" en relación a su propio historial reciente, en una escala de 0 a 100. Ninguno de estos indicadores predice el futuro: son formas de resumir el pasado que ayudan a tomar decisiones más informadas, no fórmulas que garanticen un resultado.

La disciplina más importante al leer un gráfico no es técnica, es psicológica: el análisis técnico ayuda a entender el contexto de un precio, pero no elimina el riesgo ni reemplaza una gestión de riesgo razonable (nunca invertir lo que no podés perder, no perseguir un activo que ya subió mucho por miedo a quedarte afuera — el conocido FOMO). Un gráfico bonito con una tendencia alcista no es, por sí solo, una razón suficiente para invertir.

<!-- quiz -->
```json
[
  {
    "question": "¿Qué representan las 'mechas' (wicks) de una vela japonesa?",
    "options": [
      "El volumen operado en ese período",
      "Los precios máximo y mínimo alcanzados durante ese período",
      "El precio de apertura únicamente",
      "El promedio de los últimos 7 días"
    ],
    "correctIndex": 1,
    "explanation": "El cuerpo de la vela marca apertura/cierre; las mechas marcan los extremos (máximo y mínimo) del período."
  },
  {
    "question": "¿Qué es un nivel de 'soporte' en un gráfico de precios?",
    "options": [
      "Una garantía matemática de que el precio no va a bajar más",
      "Una zona donde, históricamente, la demanda de compra tendió a frenar caídas de precio",
      "El precio mínimo posible que puede alcanzar un activo",
      "Un indicador calculado automáticamente por la exchange"
    ],
    "correctIndex": 1,
    "explanation": "Soporte y resistencia son zonas de referencia basadas en comportamiento histórico, no niveles garantizados."
  },
  {
    "question": "¿Por qué el volumen es relevante junto con el precio?",
    "options": [
      "No es relevante, solo importa el precio",
      "Porque un movimiento de precio con volumen alto refleja más convicción real que el mismo movimiento con volumen bajo",
      "Porque el volumen determina el precio de cierre exacto",
      "Porque reemplaza a las medias móviles"
    ],
    "correctIndex": 1,
    "explanation": "El volumen da contexto sobre cuánta participación real hay detrás de un movimiento de precio."
  },
  {
    "question": "¿Qué es cierto sobre los indicadores técnicos (medias móviles, RSI)?",
    "options": [
      "Garantizan el resultado de la próxima operación",
      "Son formas de resumir el comportamiento pasado del precio, no predicciones certeras del futuro",
      "Solo sirven en timeframes de 1 minuto",
      "Eliminan por completo la necesidad de gestión de riesgo"
    ],
    "correctIndex": 1,
    "explanation": "Los indicadores técnicos ayudan a interpretar el contexto histórico, pero ningún indicador predice el futuro con certeza."
  }
]
```
