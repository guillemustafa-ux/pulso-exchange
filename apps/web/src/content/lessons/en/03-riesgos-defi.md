# DeFi risks: what the APY doesn't tell you

DeFi (decentralized finance) promises returns that sometimes look magical compared to a traditional savings account, but that yield comes with risks that don't exist in traditional finance — and that are rarely explained next to the APY number. The most cited one is **impermanent loss**: when you provide liquidity to a two-token pool (e.g. ETH/USDC), if the price of one moves a lot relative to the other, you end up with less total value than if you had simply held both tokens separately in your wallet. It's not a "fake" loss: it becomes permanent the moment you withdraw your liquidity while that price gap still holds.

Another central risk is the **rug pull**: a team launches a protocol or token, attracts liquidity and TVL with an eye-catching APY, and then drains all the liquidity from the pool (or uses a hidden contract function to empty it), leaving users holding worthless tokens. A classic red flag is the lack of a **timelock** on the contract's admin functions: if the team can change rules or withdraw funds instantly and without prior notice, the rug-pull risk is much higher, no matter how much marketing the project has.

Technical risk is real even in "serious" protocols: **smart contract exploits** kept happening through 2025-2026 despite audits — cases like the Euler Finance hack (2023, ~$200M USD, later recovered after negotiating with the attacker) show that an audit reduces risk but doesn't eliminate it. **Flash loan** attacks (borrowing a huge amount with no collateral, manipulating an oracle's price within the same transaction, and repaying the loan) and **oracle manipulation** remain the most common vectors behind large DeFi thefts. A high TVL (Total Value Locked) is no guarantee of safety either: it only indicates how much money is deposited, not how well protected it is.

PULSO's DeFi module exists precisely to compare protocols with this critical lens: showing APY alongside risk signals (audits, time in production, TVL) instead of just the biggest number. The general rule when evaluating any protocol: distrust yields far above the market average, check whether the contract is verified and audited, and never put into a single protocol more than you're willing to lose entirely.

<!-- quiz -->
```json
[
  {
    "question": "What is 'impermanent loss'?",
    "options": [
      "A fixed fee charged by every liquidity pool",
      "The value difference a liquidity provider suffers when the prices of the pool's two tokens drift apart, compared to holding them separately",
      "A tax paid to the government for using DeFi",
      "The loss that occurs only if the protocol is hacked"
    ],
    "correctIndex": 1,
    "explanation": "Impermanent loss is a mathematical effect of how AMM pools work, not a hack or a fee."
  },
  {
    "question": "What is a red flag for a possible 'rug pull' in a DeFi protocol?",
    "options": [
      "The contract being verified on the explorer",
      "The team being able to withdraw funds or change rules instantly, with no timelock and no prior notice",
      "A very high TVL",
      "Having a public audit"
    ],
    "correctIndex": 1,
    "explanation": "The lack of a timelock on admin functions is one of the clearest rug-pull risk signals."
  },
  {
    "question": "What does the Euler Finance case (2023, ~$200M exploit) demonstrate?",
    "options": [
      "That audited protocols can never be hacked",
      "That an audit reduces risk but doesn't eliminate it completely",
      "That DeFi carries no real technical risk",
      "That high TVL prevents exploits"
    ],
    "correctIndex": 1,
    "explanation": "Euler was audited and still suffered a severe exploit, showing that no audit is an absolute guarantee."
  },
  {
    "question": "What does a protocol's TVL (Total Value Locked) actually measure?",
    "options": [
      "How secure the contract is",
      "How much money is deposited in the protocol, saying nothing about its security",
      "The guaranteed annual yield",
      "The number of audits it has had"
    ],
    "correctIndex": 1,
    "explanation": "TVL is only an indicator of size/popularity, not of how well protected the protocol is against exploits."
  }
]
```
