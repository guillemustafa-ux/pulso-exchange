# What is a smart contract

A smart contract is a program that runs inside a blockchain — in the case of Ethereum and compatible networks (like Sepolia, the testnet PULSO uses), on the **EVM** (Ethereum Virtual Machine). It's not a "legal contract" in the traditional sense: it's code, usually written in Solidity, that executes exactly what it says, with no intermediaries and no room for human interpretation. If the code says that sending X tokens credits you Y, that will always happen the same way, no matter who executes it — that's the central guarantee: **deterministic execution with no intermediaries**.

A key property (and also one of the biggest risks) is **immutability**: once deployed to the network, a contract's code normally can't be modified. This is a security advantage (nobody can change the rules after you trusted them) but it also means a deployed bug is a permanent bug, unless the team designed the contract with an upgrade pattern (upgradeable proxy) from the start — which, in turn, reintroduces a point of trust in whoever controls that upgrade. Every interaction with a contract costs **gas**: a fee in the network's native currency (ETH on Ethereum) that pays for the computation the transaction consumes, and which varies depending on how much demand there is for block space.

Standards are what let different contracts understand each other without prior knowledge: **ERC-20** defines how a fungible token should behave (transfers, balances, approvals) and is the foundation of the vast majority of crypto tokens, including `PulsoToken`. Newer standards like **ERC-4626** standardize how a yield "vault" should behave, making it easier for staking, lending or yield-farming protocols to integrate with each other predictably.

Before interacting with any contract — approving a spend, depositing funds — it's wise to check that the code is **verified and published** on an explorer like Etherscan, so you can read exactly what it does instead of blindly trusting an interface. PULSO's contracts, `PulsoToken` (`0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75`) and `PulsoStaking` (`0x6006EA579603439e22fb090bD5233f1f6fba06df`), are deployed and verified on Sepolia: anyone can read their public source code and confirm exactly what each function does before using them.

<!-- quiz -->
```json
[
  {
    "question": "What is a smart contract in essence?",
    "options": [
      "A legal document digitally signed by a lawyer",
      "A program that runs on the blockchain (e.g. on the EVM) and executes exactly what its code says, with no intermediaries",
      "A PDF file stored on IPFS",
      "A regulated digital bank account"
    ],
    "correctIndex": 1,
    "explanation": "A smart contract is code executed deterministically by the network, not a traditional legal document."
  },
  {
    "question": "What does the immutability of a contract deployed without an upgrade pattern imply?",
    "options": [
      "That any bug can be fixed as soon as it's detected",
      "That a deployed bug becomes permanent, because the code can no longer be modified",
      "That the contract stops working after a year",
      "That only the creator can use it"
    ],
    "correctIndex": 1,
    "explanation": "Immutability gives security against non-consented rule changes, but it also makes any code error permanent."
  },
  {
    "question": "What is the ERC-20 standard for?",
    "options": [
      "To define how a fungible token should behave (transfers, balances, approvals)",
      "To fix a token's price",
      "To guarantee a contract never has bugs",
      "To eliminate gas payments"
    ],
    "correctIndex": 0,
    "explanation": "ERC-20 is the standard that lets wallets, exchanges and other contracts interact with a token predictably."
  },
  {
    "question": "Why is it wise to check that a contract is verified on an explorer before interacting with it?",
    "options": [
      "Because that way gas is free",
      "Because it lets you read the real source code and confirm what each function does, instead of blindly trusting an interface",
      "Because it's a legal requirement in every country",
      "Because it automatically changes the token's standard"
    ],
    "correctIndex": 1,
    "explanation": "A verified contract exposes its source code publicly, which lets you audit its behavior before using it."
  }
]
```
