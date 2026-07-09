# Custodial vs. non-custodial: who controls your funds

"Not your keys, not your coins" is probably the most repeated phrase in crypto, and it sums up the central difference between two models. A **custodial** service (a centralized exchange like Binance, or a fintech offering crypto) holds the private keys for you: you see a balance in an interface, but technically those funds sit in wallets controlled by the company. It's convenient — there's account recovery, customer support, no risk of losing a seed phrase — but it means trusting that the company is solvent, honest and operationally well managed.

That trust can fail, and recent history has concrete examples: **Mt. Gox** (2014) lost around 850,000 BTC belonging to its users to a hack that wasn't detected in time, and the case is still being resolved in court more than a decade later. **FTX** (November 2022) collapsed when it was discovered that it had used customer funds to cover the risky positions of a related firm (Alameda Research), leaving millions of users without access to funds they believed were "safe" on the exchange. In both cases, the problem wasn't blockchain technology: it was that the funds were never really under their owners' control, but under a company that failed.

A **non-custodial** model inverts that relationship: the private keys live in your own wallet (MetaMask, Rainbow, a hardware wallet), and no interface can move your funds without you signing each transaction individually. This eliminates the risk that a third party goes bankrupt, gets hacked or acts in bad faith with your funds — but it shifts full responsibility onto you: if you lose your seed phrase or wallet without a backup, no support desk can recover it, and if you're tricked into signing a malicious transaction, that transaction is just as valid and irreversible as any other.

PULSO is built explicitly as non-custodial: when you connect your wallet, the Staking module builds the transactions but you're the one who signs and controls them at all times — the platform never has custody of your funds. Choosing between custodial and non-custodial isn't about "which is better" in the abstract, but about which trade-off you prefer for each amount and each use: convenience and support on one side, total control and total responsibility on the other.

<!-- quiz -->
```json
[
  {
    "question": "What does it mean for an exchange to be 'custodial'?",
    "options": [
      "That the user directly controls their private keys",
      "That the company holds the private keys and technically controls the funds the user sees as a balance",
      "That it can only be used on testnets",
      "That it charges no fees"
    ],
    "correctIndex": 1,
    "explanation": "In a custodial model, the balance you see in the interface represents funds the company technically controls."
  },
  {
    "question": "What did the collapse of FTX in November 2022 show?",
    "options": [
      "That the Bitcoin blockchain was hacked",
      "That the risk of a custodial exchange is the company's solvency and honesty, not blockchain technology itself",
      "That all centralized exchanges will collapse in 2026",
      "That non-custodial wallets also lost funds that day"
    ],
    "correctIndex": 1,
    "explanation": "FTX misused customer funds: the problem was one of management and trust, not a blockchain failure."
  },
  {
    "question": "What is the trade-off of using a non-custodial wallet?",
    "options": [
      "It has no downside",
      "That the responsibility to protect the seed and validate every transaction falls entirely on the user, with no support to recover it",
      "That transactions can be easily reversed",
      "That it needs an exchange's approval to operate"
    ],
    "correctIndex": 1,
    "explanation": "Non-custodial removes third-party risk but shifts all responsibility (and its mistakes) onto the user."
  },
  {
    "question": "How does PULSO operate regarding custody of funds?",
    "options": [
      "It stores users' private keys on its servers",
      "It's non-custodial: it builds the transactions but the user signs and controls them from their own wallet",
      "It requires depositing funds into a PULSO account before operating",
      "It only allows operating under a regulated third party's custody"
    ],
    "correctIndex": 1,
    "explanation": "PULSO never takes custody of the funds: every Staking-module action requires the user's signature in their own wallet."
  }
]
```
