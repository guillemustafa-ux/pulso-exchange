# PULSO — Contratos (Foundry)

Dos contratos Solidity que sostienen el módulo de Staking: `PulsoToken` (ERC20 de
prueba con faucet) y `PulsoStaking` (stake/unstake/claim con recompensas por segundo,
patrón `rewardPerTokenStored` estilo Synthetix). Verificados y activos en Sepolia — ver
direcciones en el [README raíz](../README.md#contratos-en-sepolia).

Las decisiones detrás de cada contrato (por qué `notifyRewardAmount` hace *pull*, por
qué `recoverERC20` excluye el `stakingToken` entero, la pausa asimétrica, el
post-mortem del bug económico de v1, etc.) están documentadas con el detalle completo
en [`../DESIGN.md`](../DESIGN.md) — este README cubre solo el *cómo*.

## Contratos

- **`src/PulsoToken.sol`** — ERC20 simple con `faucet()` público (100 PULSO / 24h por
  address). Pensado exclusivamente para que cualquiera pruebe el flujo de staking en
  testnet sin pedir tokens.
- **`src/PulsoStaking.sol`** — stake/unstake/claim/exit con recompensas proporcionales
  al stake. Checks-effects-interactions, `ReentrancyGuard`, `SafeERC20`, `Ownable2Step`,
  `Pausable` (asimétrico: `claim` se puede pausar, `unstake` nunca), custom errors,
  eventos en toda mutación de estado. Sin loops unbounded, sin `delegatecall` ni
  `assembly`.

## Tests

20 tests en total, todos verdes en CI (`.github/workflows/ci.yml`, job `contracts`):

| Archivo | Qué cubre |
|---|---|
| `test/PulsoToken.t.sol` | Unit — mint inicial, faucet, cooldown de 24h. |
| `test/PulsoStaking.t.sol` | Unit — stake/unstake/claim/exit, pausa asimétrica, `recoverERC20`, control de acceso. |
| `test/PulsoStaking.rewards.t.sol` | Fuzz — matemática de recompensas (`rewardPerToken`, `earned`) con montos y tiempos aleatorios. |
| `test/PulsoStaking.invariants.t.sol` + `test/invariants/StakingHandler.sol` | Invariantes — secuencias aleatorias de `stake/unstake/warp/notify/claim` (8 actores, ~128k llamadas/corrida): `totalSupply == Σ balances` y `balanceOf(staking) >= totalSupply + Σ earned()`. |

```bash
forge build
forge test          # todos los tests
forge test -vv       # con logs (igual que CI)
forge test --match-contract Invariants -vvv   # solo invariantes, verbose
```

> En Windows correr `forge`/`cast`/`anvil` desde **Git Bash** (no PowerShell): Foundry
> se instala con `foundryup` y el PATH (`~/.foundry/bin`) no se resuelve igual en
> PowerShell. Ver la [documentación oficial](https://book.getfoundry.sh/) para la
> instalación.

## Deploy

`script/Deploy.s.sol` despliega ambos contratos, ancla 1 PULSO de stake del deployer
(fix del bug de v1 — ver `DESIGN.md`) y fondea+arranca el período de recompensas en un
solo broadcast atómico:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url <SEPOLIA_RPC_URL> \
  --private-key <PRIVATE_KEY> \
  --broadcast \
  --verify \
  --etherscan-api-key <ETHERSCAN_API_KEY>
```

`foundry.toml` pinnea `solc 0.8.24` + optimizer (`runs = 200`) — mismos settings que la
verificación en Etherscan, para que el bytecode sea reproducible.

## Cast (lectura rápida contra Sepolia)

```bash
cast call <PULSO_STAKING_ADDRESS> "totalSupply()(uint256)" --rpc-url <SEPOLIA_RPC_URL>
cast call <PULSO_STAKING_ADDRESS> "earned(address)(uint256)" <ADDRESS> --rpc-url <SEPOLIA_RPC_URL>
```

## Documentación

- [Foundry Book](https://book.getfoundry.sh/)
- [`../DESIGN.md`](../DESIGN.md) — trade-offs, post-mortem v1, invariantes explicadas.
