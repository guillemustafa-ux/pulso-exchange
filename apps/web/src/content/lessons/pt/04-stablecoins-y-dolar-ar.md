# Stablecoins e o dólar na Argentina

Uma stablecoin é um token cripto desenhado para manter um valor estável, geralmente atrelado 1 para 1 ao dólar americano. As duas mais usadas são **USDT** (Tether) e **USDC** (Circle): ambas dizem manter reservas equivalentes em dólares e ativos líquidos para cada token emitido, e publicam relatórios de reservas periódicos, embora com nível diferente de transparência e auditoria entre uma e outra. Existem também stablecoins algorítmicas, que tentam manter o peg com mecanismos de mercado em vez de reservas — o exemplo mais lembrado é o colapso da **UST/Luna em maio de 2022**, que perdeu sua paridade com o dólar em questão de dias e apagou dezenas de bilhões de dólares, uma lição central sobre por que o desenho do lastro importa tanto quanto o nome "stablecoin".

Na Argentina, as stablecoins cumpriram um papel muito concreto: com o controle cambial ("cepo cambiario") limitando o acesso ao dólar oficial e uma diferença histórica entre o dólar oficial, o MEP, o CCL e o "blue" (informal), comprar USDT se tornou, para muita gente, a forma mais simples de se dolarizar sem passar pelo sistema bancário tradicional nem por seus limites operacionais. Isso explica por que o volume de operações P2P com USDT na Argentina está entre os mais altos da região: não é especulação, é uma resposta direta à necessidade de poupar em uma moeda que não perca poder de compra frente à inflação do peso.

Mas "estável" não significa "sem risco". Até a USDC, considerada das mais sólidas, perdeu brevemente sua paridade em março de 2023 quando parte de suas reservas ficou presa no colapso do Silicon Valley Bank — voltou a 1:1 em poucos dias, mas mostrou que o risco de contraparte (onde e como estão guardadas as reservas) é real mesmo nas stablecoins maiores. Comprar USDT ou USDC em um exchange não regulado, ou guardá-los em uma wallet sem as precauções básicas de segurança, adiciona outra camada de risco que não tem a ver com a moeda em si, mas com onde você a mantém.

O módulo Earn AR da PULSO compara justamente essas opções para a poupança na Argentina: rendimentos em ARS e em USDT/USDC oferecidos por exchanges argentinos, fintechs e protocolos DeFi, junto às cotações de referência (dólar MEP, CCL, USDT/ARS) para que a comparação seja contra o custo real de se dolarizar, e não contra um número isolado.

<!-- quiz -->
```json
[
  {
    "question": "O que uma stablecoin como USDT ou USDC tenta alcançar?",
    "options": [
      "Aumentar de preço constantemente",
      "Manter um valor estável, geralmente atrelado 1 para 1 ao dólar americano",
      "Substituir completamente o sistema bancário",
      "Funcionar só dentro de uma blockchain específica"
    ],
    "correctIndex": 1,
    "explanation": "O objetivo central de uma stablecoin é minimizar a volatilidade mantendo paridade com um ativo de referência, tipicamente o dólar."
  },
  {
    "question": "O que o colapso da UST/Luna em maio de 2022 mostrou?",
    "options": [
      "Que todas as stablecoins são igualmente seguras",
      "Que uma stablecoin algorítmica sem lastro sólido pode perder sua paridade completamente em dias",
      "Que o dólar oficial argentino é mais estável que qualquer cripto",
      "Que a USDT também colapsou naquele mês"
    ],
    "correctIndex": 1,
    "explanation": "A UST tentava manter o peg com mecanismos de mercado em vez de reservas reais, e esse desenho falhou catastroficamente."
  },
  {
    "question": "Por que as stablecoins se tornaram populares para a poupança na Argentina?",
    "options": [
      "Porque o governo as recomenda oficialmente",
      "Porque, com o controle cambial e a diferença cambial, oferecem uma forma acessível de se dolarizar frente à inflação do peso",
      "Porque não têm nenhum risco associado",
      "Porque rendem mais que qualquer aplicação de renda fixa em pesos"
    ],
    "correctIndex": 1,
    "explanation": "O uso massivo de USDT na Argentina responde a uma necessidade concreta de acesso ao dólar, não à especulação."
  },
  {
    "question": "O que aconteceu com a USDC em março de 2023?",
    "options": [
      "Perdeu sua paridade para sempre",
      "Perdeu brevemente sua paridade ao ter parte de suas reservas expostas ao colapso do Silicon Valley Bank, e a recuperou em dias",
      "Deixou de existir",
      "Subiu de preço acima de 1 dólar de forma permanente"
    ],
    "correctIndex": 1,
    "explanation": "O caso mostrou que o risco de contraparte (onde estão as reservas) é real mesmo em stablecoins consideradas sólidas."
  }
]
```
