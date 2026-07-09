# What is staking

Staking is the security mechanism of blockchains that use **Proof of Stake**, the model Ethereum adopted in 2022 (The Merge) and that Solana, Cardano and Polkadot, among others, also use. Instead of "mining" blocks by burning energy (Proof of Work, like Bitcoin), validators **lock up an amount of tokens as collateral** and, in exchange for proposing and validating blocks honestly, they earn a reward. If a validator tries to cheat (validating invalid transactions, staying offline for extended periods), the network can take away part of those locked tokens — this is called **slashing**, and it's the economic incentive that keeps the network secure.

You don't need to run your own validator (which on Ethereum requires 32 ETH and a computer running 24/7) to participate: there are two more accessible paths. **Delegated staking** locks your tokens in a contract that a validator operates on your behalf, charging a fee. **Liquid staking** (like Lido with stETH) goes one step further: it gives you a liquid token that represents your staked position, which you can keep using in DeFi while it continues generating yield. Each model has different trade-offs between control, liquidity and trust in a third party.

Staking risk isn't just validator slashing: there's also the **smart contract risk** of the contract managing the staking (a bug or exploit can compromise the locked funds, no matter how honest the validator is), and **lock-up risk**: many protocols require a waiting period (cooldown) to withdraw, during which you can't sell even if the price drops. The advertised APY isn't guaranteed either: it varies with the total amount of tokens staked across the network and with on-chain activity.

PULSO's Staking module uses the `PulsoStaking` contract, deployed and verified on Sepolia (an Ethereum testnet), which receives `PulsoToken` for staking and computes rewards transparently and auditably in the contract code — you can read exactly how the yield is calculated instead of trusting a number shown by an interface. Since the whole demo runs on testnet, it's useful for practicing the full flow (approve, stake, wait, withdraw) without risking real value.

<!-- quiz -->
```json
[
  {
    "question": "What does staking (Proof of Stake) replace compared to mining (Proof of Work)?",
    "options": [
      "Spending computational energy, replaced by locking tokens as economic collateral",
      "The need to have a wallet",
      "The use of smart contracts",
      "The existence of network fees"
    ],
    "correctIndex": 0,
    "explanation": "In Proof of Stake, security is guaranteed economically (tokens at stake) instead of computationally (mining)."
  },
  {
    "question": "What is 'slashing'?",
    "options": [
      "A fee the exchange charges for staking",
      "The penalty a validator suffers for acting dishonestly or being offline",
      "The tax the government charges on rewards",
      "The maximum limit of tokens that can be staked"
    ],
    "correctIndex": 1,
    "explanation": "Slashing is the economic punishment that keeps validators incentivized to behave honestly."
  },
  {
    "question": "What is a key difference of liquid staking (e.g. Lido's stETH) versus traditional staking?",
    "options": [
      "It carries no associated risk",
      "It gives you a liquid token you can keep using in DeFi while your position keeps generating yield",
      "It guarantees you will never suffer slashing",
      "It requires less than 1 token to participate"
    ],
    "correctIndex": 1,
    "explanation": "Liquid staking solves the 'frozen liquidity' problem by issuing a derivative token that represents your staked position."
  },
  {
    "question": "Besides validator risk, what other important risk exists when staking through a DeFi protocol?",
    "options": [
      "None, as long as the APY is high",
      "The risk of the smart contract managing the staking, which can have bugs or be exploited",
      "The risk of the token ceasing to exist physically",
      "The risk of the browser closing"
    ],
    "correctIndex": 1,
    "explanation": "A poorly audited staking contract can lose the locked funds even if the validators behave perfectly."
  }
]
```
