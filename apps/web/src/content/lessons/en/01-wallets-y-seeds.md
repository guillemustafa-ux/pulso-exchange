# Wallets and seeds: the foundation of custody

A crypto wallet doesn't "store" your coins like a file: it stores the **private keys** that prove you control an address on the blockchain. The funds always live on the network; the wallet is the key. When you install MetaMask, Rainbow or any non-custodial wallet, the app generates a **seed phrase** of 12 or 24 words following the BIP-39 standard — all of your private keys and addresses are mathematically derived from those words. Whoever holds the seed has total control of the funds, with no exceptions and no way to reverse it.

That's why the most repeated rule in the ecosystem is also the most broken one: **never share your seed phrase with anyone**, and never type it into a website, a form, a support chat or a Telegram bot. No legitimate exchange, wallet or project will ever ask you for it — not to "verify your account", not to "receive an airdrop", not to "sync" anything. Any message asking for it is a theft attempt. The safest way to store it is offline: written on paper (or engraved in metal) and kept physically, never in a text file, a phone photo, an email or an internet-connected password manager.

A **hardware** wallet (Ledger, Trezor) takes this one step further: the private key never leaves the physical device, not even when you sign a transaction from your computer. This drastically reduces the risk from malware that reads the browser's or operating system's memory, which is the most common theft vector today. For everyday use with small amounts, a software wallet (browser extension or app) connected via WalletConnect is reasonable; for large amounts or long-term savings, a hardware wallet is the standard.

PULSO is a **non-custodial** exchange: when you connect your wallet (via RainbowKit) to operate in the Staking module, the app never sees or asks for your seed or private key — it only asks you to sign specific transactions, which you approve one by one from your own wallet. The whole demo runs on Sepolia, an Ethereum testnet: the ETH and tokens you use there have no real value, so it's a safe environment to practice without risking funds.

<!-- quiz -->
```json
[
  {
    "question": "What does a non-custodial crypto wallet actually control?",
    "options": [
      "A balance that the wallet company keeps on its servers",
      "The private keys that allow signing transactions for an address on the blockchain",
      "A copy of the coins inside the phone itself",
      "The price history of each coin"
    ],
    "correctIndex": 1,
    "explanation": "The funds always live on the blockchain; the wallet only holds the private keys that prove you can move them."
  },
  {
    "question": "In which circumstance is it legitimate to be asked for your 12/24-word seed phrase?",
    "options": [
      "To 'verify' your account on an exchange",
      "To receive an airdrop or special promotion",
      "None: no legitimate service ever asks for it",
      "When technical support asks for it over chat"
    ],
    "correctIndex": 2,
    "explanation": "The seed phrase is never shared with anyone, under any pretext: whoever holds it has complete control of the funds."
  },
  {
    "question": "What is the main advantage of a hardware wallet (Ledger, Trezor) over a software wallet?",
    "options": [
      "It's free and requires no backup",
      "The private key never leaves the physical device, even when signing transactions",
      "It lets you recover the seed by calling support",
      "It works without connecting to any blockchain"
    ],
    "correctIndex": 1,
    "explanation": "Physically isolating the private key is exactly what reduces the risk of theft by malware on the computer."
  },
  {
    "question": "Why can PULSO operate without taking custody of user funds?",
    "options": [
      "Because it only handles symbolic amounts",
      "Because the user signs every transaction from their own connected wallet; PULSO never sees the seed or the private key",
      "Because all users share one common platform wallet",
      "Because the contracts can be paused at any time"
    ],
    "correctIndex": 1,
    "explanation": "That's what 'non-custodial' means: the interface builds the transaction, but the final signature always comes from the user's wallet."
  }
]
```
