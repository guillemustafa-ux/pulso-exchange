# Riscos de DeFi: o que o APY não te conta

DeFi (finanças descentralizadas) promete rendimentos que às vezes parecem mágicos comparados a uma poupança tradicional, mas esse rendimento vem acompanhado de riscos que não existem nas finanças tradicionais — e que raramente são explicados junto ao número do APY. O mais citado é a **perda impermanente** (impermanent loss): quando você fornece liquidez a um pool de dois tokens (ex. ETH/USDC), se o preço de um se move muito em relação ao outro, você termina com menos valor total do que se simplesmente tivesse mantido ambos os tokens separados na sua wallet. Não é uma perda "de mentira": ela se torna permanente no momento em que você retira a liquidez com essa diferença de preço ainda vigente.

Outro risco central são os **rug pulls**: uma equipe lança um protocolo ou token, atrai liquidez e TVL com um APY chamativo, e depois retira toda a liquidez do pool (ou usa uma função oculta do contrato para esvaziá-lo), deixando os usuários com tokens que não valem nada. Um sinal de alerta clássico é a falta de **timelock** nas funções administrativas do contrato: se a equipe pode mudar regras ou retirar fundos de forma instantânea e sem aviso prévio, o risco de rug pull é muito maior, não importa quanto marketing o projeto tenha.

O risco técnico também é real mesmo em protocolos "sérios": os **exploits de smart contracts** seguiram acontecendo em 2025-2026 apesar das auditorias — casos como o hack da Euler Finance (2023, ~200M USD, depois recuperado após negociar com o atacante) mostram que uma auditoria reduz o risco, mas não o elimina. Os ataques de **flash loans** (pedir emprestado um valor enorme sem garantia, manipular o preço de um oráculo na mesma transação, e devolver o empréstimo) e a **manipulação de oráculos** seguem sendo os vetores mais comuns de roubos grandes em DeFi. Um TVL (Total Value Locked) alto também não é garantia de segurança: só indica quanto dinheiro há depositado, não quão bem protegido está.

O módulo DeFi da PULSO existe justamente para comparar protocolos com esse olhar crítico: mostrar o APY junto a sinais de risco (auditorias, tempo em produção, TVL) em vez de mostrar só o número maior. A regra geral ao avaliar qualquer protocolo: desconfiar de rendimentos muito acima da média do mercado, revisar se o contrato está verificado e auditado, e nunca colocar em um único protocolo mais do que você está disposto a perder por completo.

<!-- quiz -->
```json
[
  {
    "question": "O que é a 'perda impermanente' (impermanent loss)?",
    "options": [
      "Uma comissão fixa que cada pool de liquidez cobra",
      "A diferença de valor que um provedor de liquidez sofre quando os preços dos dois tokens do pool se separam, comparado a tê-los mantido separados",
      "Um imposto que se paga ao governo por operar em DeFi",
      "A perda que ocorre só se o protocolo for hackeado"
    ],
    "correctIndex": 1,
    "explanation": "A impermanent loss é um efeito matemático de como os pools AMM funcionam, não um hack nem uma comissão."
  },
  {
    "question": "Qual é um sinal de alerta de possível 'rug pull' em um protocolo DeFi?",
    "options": [
      "Que o contrato esteja verificado no explorer",
      "Que a equipe possa retirar fundos ou mudar regras de forma instantânea, sem timelock nem aviso prévio",
      "Que o TVL seja muito alto",
      "Que tenha uma auditoria pública"
    ],
    "correctIndex": 1,
    "explanation": "A falta de timelock em funções administrativas é um dos sinais mais claros de risco de rug pull."
  },
  {
    "question": "O que o caso da Euler Finance (2023, exploit de ~200M USD) demonstra?",
    "options": [
      "Que protocolos auditados nunca podem ser hackeados",
      "Que uma auditoria reduz o risco mas não o elimina por completo",
      "Que DeFi não tem nenhum risco técnico real",
      "Que o TVL alto previne os exploits"
    ],
    "correctIndex": 1,
    "explanation": "A Euler estava auditada e ainda assim sofreu um exploit grave, mostrando que nenhuma auditoria é uma garantia absoluta."
  },
  {
    "question": "O que o TVL (Total Value Locked) de um protocolo realmente mede?",
    "options": [
      "Quão seguro é o contrato",
      "Quanto dinheiro há depositado no protocolo, sem dizer nada sobre sua segurança",
      "O rendimento anual garantido",
      "A quantidade de auditorias que teve"
    ],
    "correctIndex": 1,
    "explanation": "O TVL é só um indicador de tamanho/popularidade, não de quão bem protegido o protocolo está contra exploits."
  }
]
```
