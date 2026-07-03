export const meta = {
  name: 'pulso-dia-3',
  description: 'PULSO Día 3: wallet connect + UI Staking, módulo DeFi, módulo Earn Argentina (3 pistas en paralelo)',
  phases: [
    { title: 'Paralelo: Wallet+Staking / DeFi / Earn AR' },
    { title: 'Verificación' },
  ],
}

const ENTORNO = `
ENTORNO WINDOWS (restricciones duras):
- PowerShell 5.1: NO usar && para encadenar comandos. Usar ; o comandos separados.
- Directorio raíz del proyecto: C:\\Users\\Cript\\pulso-exchange
- Backend FastAPI ya corre en apps/api (puerto 8000). Frontend Vite+React en apps/web (puerto 5173).
- Design system del Día 1 ya existe en apps/web/src/components/ui/ y tokens en apps/web/src/tokens/.
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

// Direcciones reales ya deployadas y verificadas en Sepolia (Día 2)
const CONTRATOS = {
  PulsoToken: '0xb432281F4aD976253630792E4931a4D084B33c0A',
  PulsoStaking: '0x5C850800beD6E58F52F9F2721705D6675f1A9936',
  network: 'sepolia',
  chainId: 11155111,
}

// ── FASE 1: 3 pistas independientes en paralelo ──────────────────────────────
phase('Paralelo: Wallet+Staking / DeFi / Earn AR')

const [walletStaking, defi, earnAr] = await parallel([

  // ── A) Wallet connect + UI Staking ──────────────────────────────────────
  () => agent(`
${ENTORNO}

CONTRATOS YA DEPLOYADOS Y VERIFICADOS EN SEPOLIA:
${JSON.stringify(CONTRATOS, null, 2)}
Ver también C:\\Users\\Cript\\pulso-exchange\\contracts\\deployments\\sepolia.json y los ABIs compilados en contracts/out/PulsoToken.sol/PulsoToken.json y contracts/out/PulsoStaking.sol/PulsoStaking.json.

TAREA: Wallet connect real + UI de Staking/Faucet.

1. Configurar RainbowKit en apps/web/src/main.tsx: WagmiConfig + QueryClientProvider + RainbowKitProvider, tema darkTheme + accentColor violeta (#8B5CF6), chain Sepolia únicamente.
2. Crear src/components/WalletButton.tsx: botón "Conectar wallet" real (reemplaza el placeholder visual del Día 1) con estado conectado (address truncada + ENS si existe).
3. Crear src/contracts/addresses.ts leyendo las direcciones de arriba (hardcodeadas o importadas del JSON — el JSON no es accesible desde el frontend en runtime, así que hardcodealas en este archivo TS con comentario de dónde salen).
4. Crear src/contracts/abi/PulsoToken.ts y PulsoStaking.ts: copiar el ABI real de contracts/out/*.json (el campo "abi") a un array TS exportado. NO inventar el ABI — leerlo del artifact compilado real.
5. Crear src/pages/Staking.tsx:
   - Panel de conexión de wallet (si no está conectado, mostrar CTA).
   - Sección Faucet: botón "Reclamar 100 PULSO" (llama faucet() con wagmi useWriteContract), estado de cooldown con countdown (leer lastClaim con useReadContract), estados pending/confirmed/error.
   - Sección Stake: input de monto + botón Stake (approve + stake), balance disponible (useReadContract balanceOf), balance stakeado.
   - Sección Claim: rewards pendientes (earned()) con APR estimado, botón Claim.
   - Botón Exit (unstake total + claim).
   - Todos los estados de tx: spinner pending, link a Etherscan al confirmar (https://sepolia.etherscan.io/tx/{hash}), mensaje de error legible.
6. Agregar ruta /staking en el router y habilitar el link en el nav del Layout (ya existe el ítem "Staking", falta conectarlo).

Verificar que el build compila (npm run build en apps/web) sin errores de TypeScript.
`, { model: 'sonnet', label: 'dia3:wallet-staking', phase: 'Paralelo: Wallet+Staking / DeFi / Earn AR', schema: RESULTADO_SCHEMA }),

  // ── B) Módulo DeFi ───────────────────────────────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: Módulo DeFi (protocolos por TVL).

1. Router GET /api/defi/protocols en el backend (apps/api/app/routers/defi.py): consume https://api.llama.fi/protocols, retorna top 50 por TVL con campos: name, tvl, category, chains, change_7d, logo. Cache en memoria 5 min (mismo patrón que market.py del Día 1).
2. Registrar el router en apps/api/app/main.py.
3. Crear src/pages/DeFi.tsx:
   - Cards de protocolos (usar Card.tsx del design system), no tabla — hay logos y muchos datos.
   - Filtros por categoría (DEX, Lending, Liquid Staking, Bridge...) y por cadena (Ethereum, Arbitrum, etc.), filtrado local tras la carga.
   - Badge de riesgo relativo (usar Badge.tsx): TVL > $1B y antigüedad > 2 años = "Establecido" (success), TVL < $100M = "Alto Riesgo" (danger), resto = neutral.
   - Estado de carga con Skeleton.tsx, estado de error con botón retry.
4. Agregar función fetchDefiProtocols() en src/services/api.ts. Ruta /defi en el router y nav (el ítem "DeFi" ya existe en el Layout, falta conectarlo).

Verificar que GET /api/defi/protocols responde con datos reales de DefiLlama.
`, { model: 'sonnet', label: 'dia3:defi', phase: 'Paralelo: Wallet+Staking / DeFi / Earn AR', schema: RESULTADO_SCHEMA }),

  // ── C) Módulo Earn Argentina ─────────────────────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: Módulo Earn Argentina (comparador de rendimientos).

1. Crear apps/api/app/data/earn_ar.json: tabla curada con al menos 8 entradas. Campos por entrada: nombre, tipo (exchange_ar|fintech|defi), moneda (ARS|USDT|USDC|BTC), apy_aprox, url, ultima_actualizacion (fecha de hoy). Incluir: Lemon, Belo, Buenbit, Ripio, Bitso, Cocos Capital, Aave (USDC), dYdX. Agregar campo disclaimer en la respuesta del endpoint: "Tasas aproximadas. Verificá siempre antes de invertir. Esto no es asesoramiento financiero."
2. Router GET /api/earn/ar en el backend (apps/api/app/routers/earn.py): devuelve esa tabla + cotizaciones de CriptoYa (GET https://criptoya.com/api/dolar para MEP/CCL, y https://criptoya.com/api/usdt/ars/1 para USDT-ARS). Cache 10 min. Registrar el router en main.py.
3. Crear src/pages/Earn.tsx: tabla comparativa (usar Table.tsx) ordenada por APY descendente, badge de moneda (Badge.tsx), disclaimer destacado arriba de la tabla (usar el mismo patrón visual de nota/warning que ya exista en el design system, o un div con borde ámbar).
4. Agregar función fetchEarnAr() en src/services/api.ts. Ruta /earn en el router y nav (el ítem "Earn AR" ya existe en el Layout, falta conectarlo).

Verificar que GET /api/earn/ar responde con la tabla curada + cotizaciones reales de CriptoYa.
`, { model: 'sonnet', label: 'dia3:earn-ar', phase: 'Paralelo: Wallet+Staking / DeFi / Earn AR', schema: RESULTADO_SCHEMA }),

])

log(`Pistas del Día 3 completadas: wallet+staking=${walletStaking?.estado}, defi=${defi?.estado}, earnAr=${earnAr?.estado}`)

// ── FASE 2: Verificación cruzada ─────────────────────────────────────────────
phase('Verificación')

const [calidad, seguridad] = await parallel([

  () => agent(`
Verificá el Día 3 de PULSO en C:\\Users\\Cript\\pulso-exchange.

CHECKLIST:
1. src/pages/Staking.tsx, DeFi.tsx y Earn.tsx existen con contenido real (no placeholders).
2. RainbowKit está configurado en main.tsx con la chain Sepolia.
3. src/contracts/abi/PulsoToken.ts y PulsoStaking.ts contienen el ABI real copiado de contracts/out/ (no inventado) — comparalo.
4. src/contracts/addresses.ts tiene las direcciones reales: PulsoToken 0xb432281F4aD976253630792E4931a4D084B33c0A, PulsoStaking 0x5C850800beD6E58F52F9F2721705D6675f1A9936.
5. Las 3 rutas nuevas (/staking, /defi, /earn) están conectadas en el router y en el nav del Layout.
6. apps/web compila con 'npm run build' sin errores de TypeScript.
7. Los 2 routers nuevos del backend (defi.py, earn.py) están registrados en main.py.
8. El módulo Earn AR incluye el disclaimer de "no es asesoramiento financiero".

Por cada criterio que falle, indicá la acción correctiva exacta.
`, { model: 'sonnet', label: 'verify:dia3-calidad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

  () => agent(`
Revisá seguridad del Día 3 de PULSO en C:\\Users\\Cript\\pulso-exchange.

CHECKLIST:
1. Ninguna transacción de wallet (approve/stake/claim/faucet) se firma sin confirmación explícita del usuario (eso lo maneja wagmi/RainbowKit, pero verificá que no haya auto-submit).
2. El frontend no llama directo a api.llama.fi ni a criptoya.com — todo pasa por el backend (apps/api).
3. No hay ninguna clave privada ni mnemonic en el código del frontend.
4. Los montos de stake/faucet en la UI validan que el input sea un número positivo antes de armar la transacción (no confiar solo en la validación del contrato).
5. Los links a Etherescan usan la red correcta (sepolia.etherscan.io, no mainnet).

Por cada problema, indicá archivo, línea aproximada y corrección.
`, { model: 'sonnet', label: 'verify:dia3-seguridad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

])

const completados = [walletStaking, defi, earnAr].filter(r => r && r.estado !== 'fallo').map(r => r.modulo)
const issues = [walletStaking, defi, earnAr].flatMap(r => r ? r.issues : [])
const verIssues = [calidad, seguridad].filter(Boolean).filter(v => !v.aprobado).flatMap(v => v.accionesCorrectivas)

log(`✅ Completados: ${completados.join(', ')}`)
if (issues.length) log(`⚠️  Issues: ${issues.join(' | ')}`)
if (verIssues.length) log(`🔧 Acciones correctivas: ${verIssues.join(' | ')}`)

return {
  dia: 3,
  completados,
  issues: [...issues, ...verIssues],
  listo: completados.length >= 3 && verIssues.length === 0,
}
