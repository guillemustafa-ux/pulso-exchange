# Como ler gráficos de preço

Os gráficos de velas (candlesticks) são o padrão para visualizar preços em mercados cripto, e também os que a PULSO usa no módulo Mercado (com a biblioteca lightweight-charts). Cada vela representa um período de tempo fixo (1 minuto, 1 hora, 1 dia — o "timeframe") e mostra quatro dados: o preço de **abertura** e **fechamento** desse período (o corpo da vela, verde se fechou acima de onde abriu, vermelho se fechou abaixo), e o preço **máximo** e **mínimo** alcançados (as sombras ou "wicks" acima e abaixo do corpo). Ler uma única vela diz pouco; ler a sequência de velas e como elas se comportam em diferentes timeframes é o que começa a dar informação útil.

Dois conceitos aparecem em quase qualquer análise: **suporte** e **resistência**. Um suporte é um nível de preço onde, historicamente, a demanda de compra freou uma queda; uma resistência é o nível inverso, onde a pressão de venda freou uma alta. Não são linhas mágicas nem matematicamente exatas — são zonas onde muitos participantes do mercado tendem a reagir de forma parecida, por isso funcionam como referência, não como garantia. O **volume** (quanto foi negociado em cada período) é tão importante quanto o preço: um movimento de preço com volume baixo diz muito menos que o mesmo movimento com volume alto, porque reflete quanta convicção real há por trás do movimento.

Os indicadores técnicos mais comuns são médias e osciladores construídos sobre o preço: as **médias móveis** (SMA, EMA) suavizam o ruído de curto prazo para mostrar a tendência de fundo, e o cruzamento entre uma média curta e uma longa é às vezes usado como sinal de mudança de tendência. O **RSI** (Relative Strength Index) mede se um ativo está "sobrecomprado" ou "sobrevendido" em relação ao seu próprio histórico recente, numa escala de 0 a 100. Nenhum desses indicadores prevê o futuro: são formas de resumir o passado que ajudam a tomar decisões mais informadas, não fórmulas que garantam um resultado.

A disciplina mais importante ao ler um gráfico não é técnica, é psicológica: a análise técnica ajuda a entender o contexto de um preço, mas não elimina o risco nem substitui uma gestão de risco razoável (nunca investir o que você não pode perder, não perseguir um ativo que já subiu muito por medo de ficar de fora — o conhecido FOMO). Um gráfico bonito com uma tendência de alta não é, por si só, razão suficiente para investir.

<!-- quiz -->
```json
[
  {
    "question": "O que representam as 'sombras' (wicks) de uma vela japonesa?",
    "options": [
      "O volume negociado nesse período",
      "Os preços máximo e mínimo alcançados durante esse período",
      "O preço de abertura unicamente",
      "A média dos últimos 7 dias"
    ],
    "correctIndex": 1,
    "explanation": "O corpo da vela marca abertura/fechamento; as sombras marcam os extremos (máximo e mínimo) do período."
  },
  {
    "question": "O que é um nível de 'suporte' em um gráfico de preços?",
    "options": [
      "Uma garantia matemática de que o preço não vai cair mais",
      "Uma zona onde, historicamente, a demanda de compra tendeu a frear quedas de preço",
      "O preço mínimo possível que um ativo pode alcançar",
      "Um indicador calculado automaticamente pelo exchange"
    ],
    "correctIndex": 1,
    "explanation": "Suporte e resistência são zonas de referência baseadas em comportamento histórico, não níveis garantidos."
  },
  {
    "question": "Por que o volume é relevante junto com o preço?",
    "options": [
      "Não é relevante, só importa o preço",
      "Porque um movimento de preço com volume alto reflete mais convicção real que o mesmo movimento com volume baixo",
      "Porque o volume determina o preço de fechamento exato",
      "Porque substitui as médias móveis"
    ],
    "correctIndex": 1,
    "explanation": "O volume dá contexto sobre quanta participação real há por trás de um movimento de preço."
  },
  {
    "question": "O que é verdade sobre os indicadores técnicos (médias móveis, RSI)?",
    "options": [
      "Garantem o resultado da próxima operação",
      "São formas de resumir o comportamento passado do preço, não previsões certeiras do futuro",
      "Só servem em timeframes de 1 minuto",
      "Eliminam por completo a necessidade de gestão de risco"
    ],
    "correctIndex": 1,
    "explanation": "Os indicadores técnicos ajudam a interpretar o contexto histórico, mas nenhum indicador prevê o futuro com certeza."
  }
]
```
