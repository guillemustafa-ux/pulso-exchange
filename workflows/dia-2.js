export const meta = {
  name: 'pulso-dia-2',
  description: 'PULSO Día 2: contratos Solidity PulsoToken + PulsoStaking, tests Foundry, deploy Sepolia',
  phases: [
    { title: 'Contratos' },
    { title: 'Tests Foundry' },
    { title: 'Deploy Sepolia' },
    { title: 'Verificación' },
  ],
}

const ENTORNO = `
ENTORNO:
- Foundry disponible en Git Bash (PATH ~/.foundry/bin). Usar Bash tool con comandos forge/cast.
- Red: Sepolia testnet. RPC_URL y PRIVATE_KEY en C:\\Users\\Cript\\pulso-exchange\\contracts\\.env
- OpenZeppelin: si contracts/lib/openzeppelin-contracts NO existe, instalarlo primero con: forge install OpenZeppelin/openzeppelin-contracts (desde Git Bash en contracts/; requiere git).
- Directorio contratos: C:\\Users\\Cript\\pulso-exchange\\contracts
`

const SEGURIDAD_SOLIDITY = `
SEGURIDAD OBLIGATORIA EN TODOS LOS CONTRATOS:
- Patrón checks-effects-interactions en toda función que transfiera tokens.
- ReentrancyGuard en funciones stake/unstake/claim/faucet.
- SafeERC20 para todas las transferencias de tokens.
- Ownable2Step (no Ownable simple).
- Pausable: owner puede pausar stake/claim en emergencia.
- Custom errors (no revert strings): error InsufficientBalance(), error AlreadyClaimed(), etc.
- Eventos en TODA mutación de estado: event Staked, Unstaked, RewardClaimed, FaucetClaimed.
- Sin loops unbounded. Sin delegatecall. Sin assembly.
- Visibilidad explícita en todas las funciones y variables.
`

const RESULTADO_SCHEMA = {
  type: 'object',
  properties: {
    modulo: { type: 'string' },
    estado: { enum: ['ok', 'parcial', 'fallo'] },
    archivosCreados: { type: 'array', items: { type: 'string' } },
    issues: { type: 'array', items: { type: 'string' } },
    resumen: { type: 'string' },
  },
  required: ['modulo', 'estado', 'archivosCreados', 'issues', 'resumen'],
}

const VERIFICACION_SCHEMA = {
  type: 'object',
  properties: {
    modulo: { type: 'string' },
    aprobado: { type: 'boolean' },
    hallazgos: { type: 'array', items: { type: 'string' } },
    accionesCorrectivas: { type: 'array', items: { type: 'string' } },
  },
  required: ['modulo', 'aprobado', 'hallazgos', 'accionesCorrectivas'],
}

// ── FASE 1: Contratos ────────────────────────────────────────────────────────
phase('Contratos')

const contratos = await parallel([

  () => agent(`
${ENTORNO}
${SEGURIDAD_SOLIDITY}

TAREA: Escribir src/PulsoToken.sol

ERC20 básico de prueba con faucet público:
- Nombre: "Pulso Token", símbolo: "PULSO", decimals: 18.
- Constructor: mintea 1_000_000 PULSO al deployer.
- Función faucet() pública:
  - Cualquier address puede llamarla.
  - Max 100 PULSO por claim.
  - Cooldown de 24 horas por address (mapping lastClaim).
  - Custom error FaucetCooldown(uint256 nextClaimAt).
  - Emite evento FaucetClaimed(address indexed user, uint256 amount).
- Hereda: ERC20, ReentrancyGuard, Ownable2Step, Pausable.
- Función pause()/unpause() solo owner.
- El faucet respeta whenNotPaused.

Creá el archivo. Luego corré: forge build (desde Git Bash en contracts/).
Reportá si compila sin errores.
`, { model: 'sonnet', label: 'contrato:PulsoToken', phase: 'Contratos', schema: RESULTADO_SCHEMA }),

  () => agent(`
${ENTORNO}
${SEGURIDAD_SOLIDITY}

TAREA: Escribir src/PulsoStaking.sol

Staking con recompensas por segundo (patrón Synthetix rewardPerTokenStored):

Variables de estado:
  IERC20 public immutable stakingToken;
  uint256 public rewardRate;         // PULSO por segundo en total
  uint256 public rewardsDuration;    // duración de la distribución (default 30 días)
  uint256 public periodFinish;       // timestamp de fin del período
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;
  mapping(address => uint256) public balances;
  uint256 public totalSupply;

Funciones públicas:
  stake(uint256 amount): transfiere stakingToken del user al contrato, actualiza balance.
  unstake(uint256 amount): devuelve stakingToken al user.
  claim(): envía rewards acumuladas al user.
  exit(): unstake total + claim.
  earned(address account) view: retorna rewards pendientes.
  rewardPerToken() view: retorna rewardPerTokenStored actualizado.

Funciones owner:
  notifyRewardAmount(uint256 reward): inicia/extiende el período de distribución.
  setRewardsDuration(uint256 duration): solo cuando no hay período activo.
  recoverERC20(address token, uint256 amount): recuperar tokens enviados por error (no el stakingToken).

Modificador updateReward(address account): actualiza rewardPerTokenStored y rewards[account] antes de cada función de estado.

Hereda: ReentrancyGuard, Ownable2Step, Pausable. Usa SafeERC20.

Creá el archivo. Luego corré: forge build.
Reportá si compila sin errores o listá los errores exactos.
`, { model: 'sonnet', label: 'contrato:PulsoStaking', phase: 'Contratos', schema: RESULTADO_SCHEMA }),

])

// ── FASE 2: Tests Foundry ─────────────────────────────────────────────────────
phase('Tests Foundry')

const tests = await agent(`
${ENTORNO}

Los contratos PulsoToken.sol y PulsoStaking.sol ya existen en contracts/src/.

TAREA: Escribir la suite completa de tests en Foundry.

test/PulsoToken.t.sol — tests unitarios:
- testFaucetClaim: address llama faucet(), recibe 100 PULSO.
- testFaucetCooldown: segunda llamada en < 24h revierte con FaucetCooldown.
- testFaucetAfterCooldown: llamada después de 24h (vm.warp) funciona.
- testPauseBlocksFaucet: owner pausa → faucet revierte.

test/PulsoStaking.t.sol — tests unitarios:
- testStake: usuario aprueba y stakea 1000 PULSO, balance correcto.
- testUnstake: stake luego unstake, tokens devueltos.
- testEarned: después de 1 día (vm.warp), earned() > 0.
- testClaim: claim transfiere rewards al user, earned() vuelve a 0.
- testExit: exit() devuelve stake + rewards en una tx.
- testReentrancyStake: un contrato malicioso que reintenta stake durante la callback no puede (ReentrancyGuard).
- testFuzz_StakeAmount: fuzz test con uint256 amount (bound a 1..totalSupply/2).

test/PulsoStaking.invariants.t.sol — test de invariante:
- Invariante: totalSupply del contrato de staking == suma de todos los balances individuales.
  Usar StdInvariant, handler con stake/unstake aleatorio.

Corré: forge test -vv (desde Git Bash en contracts/).
Si algún test falla, arreglá el código del contrato O del test (lo que corresponda) y volvé a correr.
No entregues hasta que todos los tests pasen.
`, { model: 'sonnet', label: 'tests:foundry', phase: 'Tests Foundry', schema: RESULTADO_SCHEMA })

// ── FASE 3: Deploy Sepolia ───────────────────────────────────────────────────
phase('Deploy Sepolia')

const deploy = await agent(`
${ENTORNO}

Los contratos compilaron y los tests pasan.

TAREA: Deploy y verificación en Sepolia.

1. Crear script/Deploy.s.sol:
   - Deploy PulsoToken.
   - Deploy PulsoStaking(address(pulsoToken)).
   - Llamar pulsoToken.transfer(address(staking), 100_000e18) para fondear recompensas.
   - Llamar staking.notifyRewardAmount(100_000e18) para iniciar distribución.
   - Loggear ambas addresses con console.log.

2. Crear contracts/.env con:
   RPC_URL=https://sepolia.infura.io/v3/... (o cualquier RPC Sepolia disponible)
   PRIVATE_KEY=... (sin 0x)
   ETHERSCAN_API_KEY=...

   Si las keys no están disponibles en el entorno, crear el script pero no ejecutar el deploy;
   en su lugar indicar el comando exacto que el usuario debe correr.

3. Si las keys SÍ están disponibles, correr:
   forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY

4. Guardar las addresses desplegadas en contracts/deployments/sepolia.json:
   { "PulsoToken": "0x...", "PulsoStaking": "0x...", "network": "sepolia", "blockExplorer": "https://sepolia.etherscan.io" }

Reportá las addresses desplegadas o el comando a correr si las keys no están disponibles.
`, { model: 'sonnet', label: 'deploy:sepolia', phase: 'Deploy Sepolia', schema: RESULTADO_SCHEMA })

// ── FASE 4: Verificación de seguridad ────────────────────────────────────────
phase('Verificación')

const verif = await agent(`
Revisá los contratos en C:\\Users\\Cript\\pulso-exchange\\contracts\\src como auditor de seguridad.

CHECKLIST:
1. ¿Todas las funciones con transferencia de tokens siguen checks-effects-interactions?
2. ¿ReentrancyGuard está aplicado en stake, unstake, claim, faucet?
3. ¿Se usa SafeERC20 para TODAS las transferencias de ERC20?
4. ¿Ownable2Step (no Ownable simple)?
5. ¿Hay loops con longitud no acotada? (si hay, es un bug crítico)
6. ¿Los eventos cubren toda mutación de estado?
7. ¿El test de invariante realmente verifica totalSupply == suma de balances?
8. ¿notifyRewardAmount maneja el caso de período activo correctamente (no pierde recompensas)?
9. ¿El modificador updateReward(address(0)) en notifyRewardAmount actualiza el estado global?

Por cada issue encontrado, indicá severidad (crítico/medio/bajo), descripción exacta y corrección.
`, { model: 'sonnet', label: 'verify:contratos-seguridad', phase: 'Verificación', schema: VERIFICACION_SCHEMA })

// ── Acumular y reportar ──────────────────────────────────────────────────────
const completados = [...contratos, tests, deploy]
  .filter(r => r && r.estado !== 'fallo')
  .map(r => r.modulo)

const issues = [...contratos, tests, deploy]
  .flatMap(r => r ? r.issues : [])

const secIssues = verif && !verif.aprobado ? verif.accionesCorrectivas : []

log(`✅ Completados: ${completados.join(', ')}`)
if (issues.length) log(`⚠️  Issues: ${issues.join(' | ')}`)
if (secIssues.length) log(`🔐 Seguridad: ${secIssues.join(' | ')}`)

return {
  dia: 2,
  completados,
  issues: [...issues, ...secIssues],
  deployInfo: (deploy && deploy.resumen) || 'sin resultado del deploy — ver contracts/deployments/sepolia.json',
  listo: !!tests && tests.estado === 'ok' && secIssues.filter(i => i.toLowerCase().includes('crít')).length === 0,
}
