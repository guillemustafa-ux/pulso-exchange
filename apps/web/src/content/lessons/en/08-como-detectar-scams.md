# How to detect scams in crypto

The crypto ecosystem attracts scams for a simple reason: transactions are irreversible and, with non-custody, there's no central entity that can reverse a theft or freeze an account. That means prevention — recognizing the pattern before acting — is the only real defense. Most scams don't break any technology: they exploit the urgency, trust or lack of knowledge of whoever receives them.

A specific pattern that is very active in 2025-2026, aimed directly at developers, is the **"demo project" or "test task"**: a supposed client contacts you first (on Upwork, LinkedIn, Telegram or any freelance platform) with a generic message, and asks you to download a repository (Google Drive, GitHub, ZIP) to "audit" it, "review" it or "give a quote" — typically something that looks like a Solidity contract or a Web3 project. The theft doesn't happen when you read the code: it happens when you **run** it. The malware lives in `preinstall`/`postinstall` scripts in `package.json` that run on their own with `npm install`, in obfuscated code inside seemingly innocent files (`hardhat.config.js`, a utility file, a test), or directly in already-trojanized `node_modules`. The moment you run the project or install dependencies, the malware empties connected wallets, steals stored seed phrases, SSH keys and browser sessions. It's the campaign known as **"Contagious Interview"**, attributed to groups like Lazarus, and it's still active: any developer who presents themselves as a crypto/Web3/Solidity specialist is a direct target. The defense is simple and categorical: a legitimate auditor only needs to **read the source code as text** (pasted, in a read-only public repo, or the verified contract address on an explorer) — you never need to download or run anything. If they insist you run the project locally, it's a confirmed scam.

Other patterns are still common currency: **phishing** with cloned sites identical to real wallets or exchanges (always check the exact URL, never click links in unsolicited emails or messages); **fake airdrops** that ask you to connect your wallet and sign a transaction to "claim" free tokens — that signature actually authorizes draining your funds; **pig butchering** (a long-running romance/investment scam, where someone builds a relationship over weeks or months before convincing you to invest in a fake platform that later disappears with the money); and the **rug pulls** already seen in the DeFi risks lesson. Impersonating technical support on Discord/Telegram (fake profiles that reply first in a help chat offering "assistance" via DM) is another classic that keeps working because it exploits the urgency of someone who already has a problem.

A short checklist of red flags: unsolicited contact with an offer that's too good; pressure to act fast ("today only", "closes in minutes"); a request for your seed phrase or private key under any excuse; a request to download and run something before any formal agreement; links that don't exactly match the official domain; and promises of guaranteed returns (nothing in crypto, neither staking nor DeFi, is "guaranteed"). When in doubt, the simplest rule is also the most effective: if something asks you to act now, download something or share a key, stop and verify through an alternative channel before continuing.

<!-- quiz -->
```json
[
  {
    "question": "In the developer-targeted 'demo project' scam, when does the theft occur?",
    "options": [
      "When reading the source code in the editor without running it",
      "When downloading and running the project (e.g. running `npm install`), where the hidden malware lives",
      "When accepting the job on the freelance platform",
      "When replying to the 'client's' first message"
    ],
    "correctIndex": 1,
    "explanation": "The malware activates when you install dependencies or run the project, not by reading the code as text."
  },
  {
    "question": "What is the safe way to audit or review a contract when someone contacts you asking for that?",
    "options": [
      "Download the ZIP and open it directly in VS Code",
      "Run `npm install` first to see if it works",
      "Ask for the code as plain text, a read-only public repo, or the verified address on an explorer — without running anything",
      "Accept and solve it as fast as possible so you don't lose the client"
    ],
    "correctIndex": 2,
    "explanation": "Reading the code without running it (text, read-only repo or explorer) is the only way to review without exposing yourself to the malware."
  },
  {
    "question": "Why is a 'fake airdrop' that asks you to connect your wallet and sign a transaction dangerous?",
    "options": [
      "Because it charges a visible fee before signing",
      "Because that signature may actually authorize draining your funds, not receiving free tokens",
      "Because it requires having the wallet updated",
      "Because it only works on testnets"
    ],
    "correctIndex": 1,
    "explanation": "The signature that seems to 'claim' free tokens is often actually an approval giving the attacker access to your funds."
  },
  {
    "question": "Which of these is a red flag common to most crypto scams?",
    "options": [
      "The project having its code verified on an explorer",
      "Pressure to act fast combined with requests to share a key or run something before any formal agreement",
      "The offered yield being similar to the market average",
      "Being asked to read a contract as plain text"
    ],
    "correctIndex": 1,
    "explanation": "Artificial urgency together with requests for keys or file execution is the common pattern behind most scams."
  }
]
```
