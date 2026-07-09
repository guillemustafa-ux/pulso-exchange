# Custodial vs. non-custodial: quem controla seus fundos

"Not your keys, not your coins" é provavelmente a frase mais repetida em cripto, e resume a diferença central entre dois modelos. Um serviço **custodial** (um exchange centralizado como a Binance, ou uma fintech que oferece cripto) guarda as chaves privadas por você: você vê um saldo em uma interface, mas tecnicamente esses fundos estão em wallets controladas pela empresa. É cômodo — há recuperação de conta, suporte ao cliente, não há risco de perder uma seed phrase — mas implica confiar que a empresa seja solvente, honesta e esteja bem gerida operacionalmente.

Essa confiança pode falhar, e a história recente tem exemplos concretos: a **Mt. Gox** (2014) perdeu cerca de 850.000 BTC de seus usuários por um hack não detectado a tempo, e o caso segue sendo resolvido judicialmente mais de uma década depois. A **FTX** (novembro de 2022) colapsou quando se descobriu que havia usado fundos de clientes para cobrir posições de risco de uma firma relacionada (Alameda Research), deixando milhões de usuários sem acesso a fundos que acreditavam estar "seguros" no exchange. Em ambos os casos, o problema não foi a tecnologia blockchain: foi que os fundos nunca estiveram realmente sob o controle de seus donos, mas de uma empresa que falhou.

Um modelo **non-custodial** inverte essa relação: as chaves privadas vivem na sua própria wallet (MetaMask, Rainbow, uma hardware wallet), e nenhuma interface pode mover seus fundos sem que você assine cada transação individualmente. Isso elimina o risco de que um terceiro quebre, seja hackeado ou aja de má-fé com seus fundos — mas transfere a responsabilidade completa para você: se perder sua seed phrase ou wallet sem backup, não há suporte técnico que possa recuperá-la, e se te enganarem para assinar uma transação maliciosa, a transação é tão válida e irreversível quanto qualquer outra.

A PULSO está construída explicitamente como non-custodial: ao conectar sua wallet, o módulo de Staking monta as transações mas é você quem as assina e controla o tempo todo — a plataforma nunca tem custódia dos seus fundos. Escolher entre custodial e non-custodial não é "qual é melhor" em abstrato, mas qual trade-off você prefere para cada valor e cada uso: comodidade e suporte de um lado, controle total e responsabilidade total do outro.

<!-- quiz -->
```json
[
  {
    "question": "O que significa um exchange ser 'custodial'?",
    "options": [
      "Que o usuário controla diretamente suas chaves privadas",
      "Que a empresa guarda as chaves privadas e controla tecnicamente os fundos que o usuário vê como saldo",
      "Que só pode ser usado em testnets",
      "Que não cobra taxas"
    ],
    "correctIndex": 1,
    "explanation": "Em um modelo custodial, o saldo que você vê na interface representa fundos que tecnicamente a empresa controla."
  },
  {
    "question": "O que o colapso da FTX em novembro de 2022 mostrou?",
    "options": [
      "Que a blockchain do Bitcoin foi hackeada",
      "Que o risco de um exchange custodial é a solvência e honestidade da empresa, não a tecnologia blockchain em si",
      "Que todos os exchanges centralizados vão colapsar em 2026",
      "Que as wallets non-custodial também perderam fundos naquele dia"
    ],
    "correctIndex": 1,
    "explanation": "A FTX usou fundos de clientes de forma indevida: o problema foi de gestão e confiança, não uma falha da blockchain."
  },
  {
    "question": "Qual é a contrapartida de usar uma wallet non-custodial?",
    "options": [
      "Não tem nenhuma desvantagem",
      "Que a responsabilidade de proteger a seed e validar cada transação recai completamente sobre o usuário, sem suporte que a recupere",
      "Que as transações podem ser revertidas facilmente",
      "Que precisa de aprovação de um exchange para operar"
    ],
    "correctIndex": 1,
    "explanation": "O non-custodial elimina o risco de terceiros mas transfere toda a responsabilidade (e seus erros) ao próprio usuário."
  },
  {
    "question": "Como a PULSO opera em relação à custódia de fundos?",
    "options": [
      "Guarda as chaves privadas dos usuários em seus servidores",
      "É non-custodial: monta as transações mas o usuário as assina e controla a partir da sua própria wallet",
      "Requer depositar fundos em uma conta da PULSO antes de operar",
      "Só permite operar sob custódia de um terceiro regulado"
    ],
    "correctIndex": 1,
    "explanation": "A PULSO nunca tem custódia dos fundos: cada ação do módulo de Staking requer a assinatura do usuário na sua própria wallet."
  }
]
```
