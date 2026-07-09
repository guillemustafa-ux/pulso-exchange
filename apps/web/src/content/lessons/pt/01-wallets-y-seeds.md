# Wallets e seeds: a base da custódia

Uma wallet cripto não "guarda" suas moedas como se fossem um arquivo: ela guarda as **chaves privadas** que provam que você controla um endereço na blockchain. Os fundos sempre vivem na rede; a wallet é a chave. Quando você instala MetaMask, Rainbow ou qualquer wallet non-custodial, esse app gera uma **seed phrase** (frase semente) de 12 ou 24 palavras seguindo o padrão BIP-39 — a partir dessas palavras se derivam matematicamente todas as suas chaves privadas e endereços. Quem tiver a seed tem controle total dos fundos, sem exceção e sem forma de reverter.

Por isso a regra mais repetida do ecossistema é também a mais descumprida: **nunca compartilhe sua seed phrase com ninguém**, nunca a escreva em um site, um formulário, um chat de suporte ou um bot de Telegram. Nenhum exchange, wallet ou projeto legítimo vai pedi-la jamais — nem para "verificar sua conta", nem para "receber um airdrop", nem para "sincronizar" nada. Toda mensagem que a pedir é uma tentativa de roubo. A forma mais segura de guardá-la é offline: anotada em papel (ou gravada em metal) e guardada fisicamente, nunca em um arquivo de texto, foto do celular, e-mail ou gerenciador de senhas conectado à internet.

Uma wallet de **hardware** (Ledger, Trezor) leva isso um passo além: a chave privada nunca sai do dispositivo físico, nem mesmo quando você assina uma transação a partir do seu computador. Isso reduz drasticamente o risco de malware que lê a memória do navegador ou do sistema operacional, que é o vetor de roubo mais comum hoje. Para uso cotidiano com valores pequenos, uma wallet de software (extensão de navegador ou app) conectada por WalletConnect é razoável; para valores grandes ou poupança de longo prazo, a hardware wallet é o padrão.

A PULSO é um exchange **non-custodial**: quando você conecta sua wallet (via RainbowKit) para operar no módulo de Staking, o app nunca vê nem pede sua seed ou chave privada — só pede que você assine transações pontuais, que você aprova uma a uma a partir da sua própria wallet. Toda a demo roda sobre a Sepolia, uma testnet da Ethereum: os ETH e tokens que você usa ali não têm valor real, então é um ambiente seguro para praticar sem arriscar fundos.

<!-- quiz -->
```json
[
  {
    "question": "O que uma wallet cripto non-custodial realmente controla?",
    "options": [
      "Um saldo que a empresa da wallet guarda em seus servidores",
      "As chaves privadas que permitem assinar transações sobre um endereço na blockchain",
      "Uma cópia das moedas dentro do próprio celular",
      "O histórico de preços de cada moeda"
    ],
    "correctIndex": 1,
    "explanation": "Os fundos sempre estão na blockchain; a wallet só guarda as chaves privadas que provam que você pode movê-los."
  },
  {
    "question": "Em qual circunstância é legítimo pedirem sua seed phrase de 12/24 palavras?",
    "options": [
      "Para 'verificar' sua conta em um exchange",
      "Para receber um airdrop ou promoção especial",
      "Em nenhuma: nenhum serviço legítimo a pede jamais",
      "Quando o suporte técnico a pede por chat"
    ],
    "correctIndex": 2,
    "explanation": "A seed phrase nunca se compartilha com ninguém, sob nenhum pretexto: quem a tem controla os fundos por completo."
  },
  {
    "question": "Qual é a principal vantagem de uma hardware wallet (Ledger, Trezor) frente a uma wallet de software?",
    "options": [
      "É grátis e não requer backup",
      "A chave privada nunca sai do dispositivo físico, mesmo ao assinar transações",
      "Permite recuperar a seed ligando para o suporte",
      "Funciona sem conexão com nenhuma blockchain"
    ],
    "correctIndex": 1,
    "explanation": "O isolamento físico da chave privada é justamente o que reduz o risco de roubo por malware no computador."
  },
  {
    "question": "Por que a PULSO pode operar sem custodiar os fundos do usuário?",
    "options": [
      "Porque só opera com valores simbólicos",
      "Porque o usuário assina cada transação a partir da sua própria wallet conectada; a PULSO nunca vê a seed nem a chave privada",
      "Porque todos os usuários compartilham uma wallet comum da plataforma",
      "Porque os contratos podem ser pausados a qualquer momento"
    ],
    "correctIndex": 1,
    "explanation": "Esse é o sentido de 'non-custodial': a interface monta a transação, mas a assinatura final sempre vem da wallet do usuário."
  }
]
```
