# PULSO — Decisiones de diseño y trade-offs

Este documento explica **por qué** el sistema está construido como está — las decisiones
que el código toma pero no cuenta. Complementa al README (que explica cómo correrlo).

## Contratos (Solidity / Foundry / Sepolia)

### Direcciones vigentes (v2)

| Contrato | Address | Estado |
|---|---|---|
| PulsoToken | [`0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75`](https://sepolia.etherscan.io/address/0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75) | Verificado, activo |
| PulsoStaking | [`0x6006EA579603439e22fb090bD5233f1f6fba06df`](https://sepolia.etherscan.io/address/0x6006EA579603439e22fb090bD5233f1f6fba06df) | Verificado, activo |
| v1 (deprecados) | `0xb432…3c0A` / `0x5C85…9936` | Ver post-mortem abajo |

### Post-mortem v1: el edge case del patrón Synthetix, encontrado en casa

El deploy v1 llamó `notifyRewardAmount` en el mismo broadcast del deploy, **antes de que
existiera ningún staker**. Con `totalSupply == 0`, `rewardPerToken()` no avanza pero
`lastUpdateTime` sí: todo lo goteado hasta el primer `stake()` no se acredita a nadie, y
como `recoverERC20` excluye el `stakingToken` por completo, esos tokens quedan
**irrecuperables por diseño**. Cuantificado on-chain con `cast` durante la auditoría
interna: ~917 PULSO huérfanos en ~6,6 horas (rate 3.334 PULSO/día).

**Fix en v2 (dos capas):**
1. `notifyRewardAmount` revierte con `NoStakers()` si `totalSupply == 0`.
2. `Deploy.s.sol` ancla 1 PULSO de stake del deployer **antes** de fondear.

**Alternativa descartada:** congelar `lastUpdateTime` mientras `totalSupply == 0`
(variante que usan algunos forks de Synthetix). Le regala el tramo entero acumulado al
primer staker que entre — front-runneable y peor que exigir el ancla.

**Demostración con tests:** `test_RevertWhen_NotifyWithZeroSupply` (el fix) y
`test_OrphanedRewards_WhenEveryoneExitsMidPeriod` (cuantifica el escenario residual:
si TODOS salen a mitad de período, ese tramo también se orfana — trade-off conocido y
aceptado; evitarlo requeriría loops sobre stakers o checkpoints, gas que no se justifica).

### Pausa asimétrica: `claim` pausable, `unstake` nunca

`pause()` bloquea `stake` y `claim` pero **nunca** `unstake`: ante una emergencia el
owner puede frenar la entrada y la distribución, pero el principal de los usuarios
siempre es retirable. En un sistema que se dice non-custodial, un pause que encierra
fondos es una contradicción. `exit()` en pausa revierte por la porción `claim`; el
usuario puede llamar `unstake()` directo y recuperar su principal.

### `recoverERC20` excluye el `stakingToken` entero

La versión clásica permite recuperar "el excedente" (`balance - totalSupply`), pero ese
cálculo es frágil (rebasing tokens, dust de truncamiento, race con claims pendientes).
Preferimos la regla simple e imposible de equivocar: **el owner jamás puede tocar el
stakingToken**, bajo ninguna denominación. El costo es el descrito en el post-mortem
(huérfanos irrecuperables); es deliberado.

### `notifyRewardAmount` hace *pull* (`transferFrom`), no asume transferencia previa

El owner aprueba y el contrato tira: el fondeo y el arranque del período son atómicos.
El patrón "transferí primero y después avisá" tiene un estado intermedio donde los
tokens ya están pero el rate no — y un bug de orquestación (como el que tuvimos en el
script v1) se vuelve más difícil de razonar. Tras el pull hay un chequeo de solvencia
que resta el principal stakeado (`balance - totalSupply`) — más estricto que el
Synthetix original, que compara contra el balance bruto.

### Faucet sybileable — limitación conocida y aceptada

`PulsoToken.faucet()` da 100 PULSO/24h por address, sin costo real en Sepolia. N wallets
→ 100·N/día, y como el mismo token se stakea, un sybil puede diluir las recompensas de
stakers honestos. **En mainnet esto sería crítico.** Acá es una demo educativa en
testnet: el objetivo del faucet es que cualquiera pruebe el flujo completo sin pedir
tokens. Se declara en el natspec del contrato para que la decisión sea visible.

### Invariantes fuzzeados (no solo unit tests)

Dos invariantes corren con secuencias aleatorias de `stake/unstake/warp/notify/claim`
(8 actores, ~128k llamadas por corrida):
1. **Contabilidad**: `totalSupply == Σ balances` siempre.
2. **Solvencia**: `balanceOf(staking) >= totalSupply + Σ earned()` — si esto se
   rompiera, algún `claim`/`exit` futuro revertiría por falta de fondos. Es `>=` y no
   `==` porque el truncamiento de `rewardRate` y los tramos sin stakers dejan dust a
   favor del contrato, nunca en contra.

### Builds reproducibles

`foundry.toml` pinnea `solc 0.8.24` + optimizer (mismos settings que la verificación
en Etherscan). Ambos contratos comparten pragma. Sin esto, un `forge` de dentro de seis
meses puede compilar bytecode distinto al verificado.

## Backend (FastAPI)

- **Cache en memoria con TTL + single-flight** (no Redis): una sola instancia de demo
  no justifica infraestructura extra. Limitación aceptada: se pierde en cada restart y
  no se comparte entre workers. Con `--workers 2+` cada proceso tiene su propia cache.
- **Rate limiting por IP en memoria**: misma decisión y mismas limitaciones. Detrás de
  un proxy (Render/Railway) requiere `--proxy-headers` + `X-Forwarded-For` del hop
  confiable — sin eso, todos los usuarios comparten un bucket. *(Pendiente conocido.)*
- **El frontend nunca llama a APIs externas directo**: CoinGecko/Binance/DefiLlama/
  CriptoYa/Groq pasan todos por el backend. Una sola política de cache, rate limit y
  manejo de errores; las keys nunca viajan al cliente.

## Frontend (Vite + React + wagmi v2)

- **ABIs copiados del artifact compilado** (`contracts/out/*.json`), nunca escritos a
  mano — un ABI desincronizado falla silencioso decodificando reverts.
- **Direcciones hardcodeadas en `contracts/addresses.ts`** con la fuente documentada:
  Vite solo empaqueta lo que vive dentro de `apps/web`, el JSON de deployments no es
  accesible en runtime.
- **Un hook de transacción por acción** (`useTxAction`): cada botón (faucet, approve,
  stake, claim, exit) tiene su propia máquina de estados — spinners independientes, sin
  estado global compartido que se pise. El hook distingue receipt obtenida de tx
  exitosa (`status === 'reverted'` → error): gotcha real de wagmi v2 donde un revert
  on-chain se mostraría como éxito.
- **Approve infinito (`maxUint256`)**: patrón UX estándar (una firma, no una por stake).
  Trade-off consciente para una demo con token propio; en un producto real con tokens
  de valor, allowance exacto o incremental.

## Operación / meta

- Los workflows de construcción (`workflows/dia-*.js`) orquestan agentes que escriben,
  verifican (calidad + seguridad, en paralelo) y reportan — cada día termina con build
  verde y verificación visual en navegador antes de commitear.
- La auditoría interna que produjo el post-mortem v1 y esta página se corrió como
  revisión adversarial independiente sobre el código ya deployado — el mismo proceso
  que se esperaría de un revisor externo.
