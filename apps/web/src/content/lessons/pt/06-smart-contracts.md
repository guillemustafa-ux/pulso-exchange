# O que é um smart contract

Um smart contract (contrato inteligente) é um programa que roda dentro de uma blockchain — no caso da Ethereum e redes compatíveis (como a Sepolia, a testnet que a PULSO usa), na **EVM** (Ethereum Virtual Machine). Não é um "contrato legal" no sentido tradicional: é código, geralmente escrito em Solidity, que executa exatamente o que diz, sem intermediários nem margem de interpretação humana. Se o código diz que ao enviar X tokens você recebe Y, isso vai acontecer sempre igual, não importa quem o execute — essa é a garantia central: **execução determinística e sem intermediários**.

Uma propriedade-chave (e também um dos maiores riscos) é a **imutabilidade**: uma vez implantado na rede, o código de um contrato normalmente não pode ser modificado. Isso é uma vantagem de segurança (ninguém pode mudar as regras depois que você confiou nelas), mas também significa que um bug implantado é um bug permanente, a menos que a equipe tenha desenhado o contrato com um padrão de atualização (proxy upgradeable) desde o início — o que, por sua vez, reintroduz um ponto de confiança em quem controla essa atualização. Cada interação com um contrato custa **gas**: uma taxa na moeda nativa da rede (ETH na Ethereum) que paga o processamento que essa transação consome, e que varia conforme quanta demanda há por espaço nos blocos.

Os padrões são o que permite que contratos diferentes se entendam entre si sem se conhecer de antemão: o **ERC-20** define como um token fungível deve se comportar (transferências, saldos, aprovações) e é a base da enorme maioria dos tokens cripto, incluindo o `PulsoToken`. Padrões mais novos como o **ERC-4626** padronizam como uma "vault" (cofre de rendimento) deve se comportar, facilitando que protocolos de staking, empréstimos ou yield farming se integrem entre si de forma previsível.

Antes de interagir com qualquer contrato — aprovar um gasto, depositar fundos — convém verificar que o código esteja **verificado e publicado** em um explorer como o Etherscan, para poder ler exatamente o que ele faz, em vez de confiar cegamente em uma interface. Os contratos da PULSO, `PulsoToken` (`0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75`) e `PulsoStaking` (`0x6006EA579603439e22fb090bD5233f1f6fba06df`), estão implantados e verificados na Sepolia: qualquer um pode ler seu código-fonte público e confirmar exatamente o que cada função faz antes de usá-las.

<!-- quiz -->
```json
[
  {
    "question": "O que é um smart contract em essência?",
    "options": [
      "Um documento legal assinado digitalmente por um advogado",
      "Um programa que roda na blockchain (ex. na EVM) e executa exatamente o que seu código diz, sem intermediários",
      "Um arquivo PDF armazenado no IPFS",
      "Uma conta bancária digital regulada"
    ],
    "correctIndex": 1,
    "explanation": "Um smart contract é código executado de forma determinística pela rede, não um documento legal tradicional."
  },
  {
    "question": "O que implica a imutabilidade de um contrato implantado sem padrão de atualização?",
    "options": [
      "Que se pode corrigir qualquer bug assim que é detectado",
      "Que um bug implantado fica permanente, porque o código já não pode ser modificado",
      "Que o contrato deixa de funcionar depois de um ano",
      "Que só o criador pode usá-lo"
    ],
    "correctIndex": 1,
    "explanation": "A imutabilidade dá segurança frente a mudanças de regras não consentidas, mas também torna permanente qualquer erro de código."
  },
  {
    "question": "Para que serve o padrão ERC-20?",
    "options": [
      "Para definir como um token fungível deve se comportar (transferências, saldos, aprovações)",
      "Para fixar o preço de um token",
      "Para garantir que um contrato nunca tenha bugs",
      "Para eliminar o pagamento de gas"
    ],
    "correctIndex": 0,
    "explanation": "O ERC-20 é o padrão que permite que wallets, exchanges e outros contratos interajam com um token de forma previsível."
  },
  {
    "question": "Por que convém revisar se um contrato está verificado em um explorer antes de interagir com ele?",
    "options": [
      "Porque assim o gas é grátis",
      "Porque permite ler o código-fonte real e confirmar o que cada função faz, em vez de confiar cegamente em uma interface",
      "Porque é um requisito legal em todos os países",
      "Porque muda o padrão do token automaticamente"
    ],
    "correctIndex": 1,
    "explanation": "Um contrato verificado expõe seu código-fonte publicamente, o que permite auditar seu comportamento antes de usá-lo."
  }
]
```
