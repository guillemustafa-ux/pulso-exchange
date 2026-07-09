# O que é staking

O staking é o mecanismo de segurança das blockchains que usam **Proof of Stake** (Prova de Participação), o modelo que a Ethereum adotou em 2022 (The Merge) e que Solana, Cardano e Polkadot, entre outras, também usam. Em vez de "minerar" blocos gastando energia (Proof of Work, como o Bitcoin), os validadores **bloqueiam uma quantidade de tokens como garantia** e, em troca de propor e validar blocos honestamente, recebem uma recompensa. Se um validador tenta trapacear (validar transações inválidas, ficar offline de forma prolongada), a rede pode tirar parte desses tokens bloqueados — isso se chama **slashing** e é o incentivo econômico que mantém a rede segura.

Não é preciso rodar um validador próprio (que na Ethereum requer 32 ETH e um computador rodando 24/7) para participar: existem dois caminhos mais acessíveis. O **delegated staking** deixa seu token bloqueado em um contrato que um validador opera por você, cobrando uma comissão. O **liquid staking** (como a Lido com stETH) vai um passo além: entrega um token líquido que representa sua posição em staking, que você pode continuar usando em DeFi enquanto ela segue gerando rendimento. Cada modelo tem trade-offs distintos entre controle, liquidez e confiança em um terceiro.

O risco de staking não é só o slashing do validador: também existe o **risco do smart contract** que gerencia o staking (um bug ou exploit pode comprometer os fundos bloqueados, não importa quão honesto seja o validador), e o **risco de lock-up**: muitos protocolos exigem um período de espera (cooldown) para sacar, durante o qual você não pode vender mesmo que o preço caia. O APY anunciado também não é garantido: varia conforme a quantidade total de tokens em staking em toda a rede e conforme a atividade da cadeia.

O módulo de Staking da PULSO usa o contrato `PulsoStaking`, implantado e verificado na Sepolia (testnet da Ethereum), que recebe `PulsoToken` em staking e calcula recompensas de forma transparente e auditável no código do contrato — você pode ler exatamente como o rendimento é calculado em vez de confiar em um número que uma interface mostra. Como toda a demo roda em testnet, serve para praticar o fluxo completo (aprovar, fazer staking, esperar, sacar) sem arriscar valor real.

<!-- quiz -->
```json
[
  {
    "question": "O que o staking (Proof of Stake) substitui em relação à mineração (Proof of Work)?",
    "options": [
      "O gasto de energia computacional por bloquear tokens como garantia econômica",
      "A necessidade de ter uma wallet",
      "O uso de contratos inteligentes",
      "A existência de taxas de rede"
    ],
    "correctIndex": 0,
    "explanation": "No Proof of Stake a segurança se garante economicamente (tokens em jogo) em vez de com computação (mineração)."
  },
  {
    "question": "O que é o 'slashing'?",
    "options": [
      "Uma comissão que o exchange cobra por fazer staking",
      "A penalidade que um validador perde ao agir de forma desonesta ou ficar offline",
      "O imposto que o governo cobra sobre as recompensas",
      "O limite máximo de tokens que se pode colocar em staking"
    ],
    "correctIndex": 1,
    "explanation": "O slashing é o castigo econômico que mantém os validadores incentivados a se comportar honestamente."
  },
  {
    "question": "Qual é uma diferença-chave do liquid staking (ex. stETH da Lido) frente ao staking tradicional?",
    "options": [
      "Não tem nenhum risco associado",
      "Entrega um token líquido que você pode continuar usando em DeFi enquanto sua posição segue gerando rendimento",
      "Garante que você nunca vai sofrer slashing",
      "Requer menos de 1 token para participar"
    ],
    "correctIndex": 1,
    "explanation": "O liquid staking resolve o problema de 'liquidez congelada' emitindo um token derivado que representa sua posição em staking."
  },
  {
    "question": "Além do risco do validador, que outro risco importante existe ao fazer staking em um protocolo DeFi?",
    "options": [
      "Nenhum, se o APY for alto",
      "O risco do smart contract que gerencia o staking, que pode ter bugs ou ser explorado",
      "O risco de o token deixar de existir fisicamente",
      "O risco de o navegador fechar"
    ],
    "correctIndex": 1,
    "explanation": "Um contrato de staking mal auditado pode perder os fundos bloqueados mesmo que os validadores se comportem perfeitamente bem."
  }
]
```
