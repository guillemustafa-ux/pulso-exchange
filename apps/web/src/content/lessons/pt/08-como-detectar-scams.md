# Como detectar golpes em cripto

O ecossistema cripto atrai golpes por uma razão simples: as transações são irreversíveis e, com non-custódia, não há nenhuma entidade central que possa reverter um roubo ou congelar uma conta. Isso significa que a prevenção — reconhecer o padrão antes de agir — é a única defesa real. A maioria dos golpes não quebra nenhuma tecnologia: eles exploram a urgência, a confiança ou o desconhecimento de quem os recebe.

Um padrão específico e muito ativo em 2025-2026, mirando diretamente desenvolvedores, é o do **"demo project" ou "test task"**: um suposto cliente te contata primeiro (no Upwork, LinkedIn, Telegram ou qualquer plataforma freelance) com uma mensagem genérica, e pede que você baixe um repositório (Google Drive, GitHub, ZIP) para "auditá-lo", "revisá-lo" ou "dar um orçamento" — tipicamente algo com cara de contrato Solidity ou projeto Web3. O roubo não ocorre ao ler o código: ocorre ao **executá-lo**. O malware vive em scripts `preinstall`/`postinstall` do `package.json` que rodam sozinhos com `npm install`, em código ofuscado dentro de arquivos aparentemente inocentes (`hardhat.config.js`, um arquivo de utilidades, um teste), ou diretamente em `node_modules` já trojanizado. Assim que você roda o projeto ou instala dependências, o malware esvazia wallets conectadas, rouba seed phrases guardadas, chaves SSH e sessões do navegador. É a campanha conhecida como **"Contagious Interview"**, atribuída a grupos como o Lazarus, e segue ativa: qualquer desenvolvedor que se apresente como especialista em crypto/Web3/Solidity é um alvo direto. A defesa é simples e categórica: um auditor legítimo só precisa **ler o código-fonte como texto** (colado, em um repo público de somente leitura, ou o endereço do contrato verificado em um explorer) — nunca é preciso baixar nem executar nada. Se insistirem que você rode o projeto localmente, é um golpe confirmado.

Outros padrões seguem sendo moeda corrente: o **phishing** com sites clonados idênticos a wallets ou exchanges reais (revisar sempre a URL exata, nunca clicar em links de e-mails ou mensagens não solicitadas); os **fake airdrops** que pedem para conectar sua wallet e assinar uma transação para "resgatar" tokens grátis — essa assinatura na verdade autoriza o esvaziamento dos seus fundos; o **pig butchering** (golpe romântico/de investimento de longo prazo, onde alguém constrói uma relação de semanas ou meses antes de te convencer a investir em uma plataforma falsa que depois desaparece com o dinheiro); e os **rug pulls** já vistos na lição de riscos de DeFi. A impersonação de suporte técnico no Discord/Telegram (perfis falsos que respondem primeiro em um chat de ajuda oferecendo "assistência" por DM) é outro clássico que segue funcionando porque explora a urgência de quem já tem um problema.

Um checklist curto de bandeiras vermelhas: contato não solicitado com uma oferta boa demais; pressão para agir rápido ("só por hoje", "encerra em minutos"); pedido da sua seed phrase ou chave privada sob qualquer desculpa; pedido para baixar e executar algo antes de qualquer acordo formal; links que não coincidem exatamente com o domínio oficial; e promessas de rendimento garantido (nada em cripto, nem em staking nem em DeFi, é "garantido"). Na dúvida, a regra mais simples é também a mais eficaz: se algo te pede para agir já, baixar algo ou compartilhar uma chave, pare e verifique por um canal alternativo antes de continuar.

<!-- quiz -->
```json
[
  {
    "question": "No golpe do 'demo project' dirigido a desenvolvedores, em que momento ocorre o roubo?",
    "options": [
      "Ao ler o código-fonte no editor sem executá-lo",
      "Ao baixar e executar o projeto (ex. rodar `npm install`), onde vive o malware oculto",
      "Ao aceitar o trabalho na plataforma freelance",
      "Ao responder a primeira mensagem do 'cliente'"
    ],
    "correctIndex": 1,
    "explanation": "O malware se ativa ao instalar dependências ou rodar o projeto, não por ler o código como texto."
  },
  {
    "question": "Qual é a forma segura de auditar ou revisar um contrato quando alguém te contata pedindo isso?",
    "options": [
      "Baixar o ZIP e abri-lo diretamente no VS Code",
      "Rodar `npm install` primeiro para ver se funciona",
      "Pedir o código como texto puro, um repo público de somente leitura, ou o endereço verificado em um explorer — sem executar nada",
      "Aceitar e resolvê-lo o mais rápido possível para não perder o cliente"
    ],
    "correctIndex": 2,
    "explanation": "Ler o código sem executá-lo (texto, repo de somente leitura ou explorer) é a única forma de revisar sem se expor ao malware."
  },
  {
    "question": "Por que um 'fake airdrop' que pede para conectar sua wallet e assinar uma transação é perigoso?",
    "options": [
      "Porque cobra uma comissão visível antes de assinar",
      "Porque essa assinatura pode autorizar na verdade o esvaziamento dos seus fundos, não o recebimento de tokens grátis",
      "Porque requer ter a wallet atualizada",
      "Porque só funciona em testnets"
    ],
    "correctIndex": 1,
    "explanation": "A assinatura que parece 'resgatar' tokens grátis costuma ser na verdade uma aprovação que dá ao atacante acesso aos seus fundos."
  },
  {
    "question": "Qual destas é uma bandeira vermelha comum à maioria dos golpes cripto?",
    "options": [
      "Que o projeto tenha seu código verificado em um explorer",
      "A pressão para agir rápido combinada com pedidos de compartilhar uma chave ou executar algo antes de qualquer acordo formal",
      "Que o rendimento oferecido seja similar à média do mercado",
      "Que peçam para você ler um contrato como texto puro"
    ],
    "correctIndex": 1,
    "explanation": "A urgência artificial junto com pedidos de chaves ou execução de arquivos é o padrão comum por trás da maioria dos golpes."
  }
]
```
