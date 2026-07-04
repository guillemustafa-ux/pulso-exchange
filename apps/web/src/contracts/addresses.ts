/**
 * Direcciones de contratos deployados en Sepolia.
 *
 * Hardcodeadas a propósito: el JSON de origen (`contracts/deployments/sepolia.json`)
 * vive fuera de `apps/web` y no es accesible en runtime desde el frontend (Vite
 * solo empaqueta lo que está dentro de `apps/web`). Si se re-deploya algún
 * contrato, copiar los valores nuevos desde ese JSON a este archivo.
 *
 * Fuente: contracts/deployments/sepolia.json
 * {
 *   "PulsoToken": "0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75",
 *   "PulsoStaking": "0x6006EA579603439e22fb090bD5233f1f6fba06df",
 *   "network": "sepolia",
 *   "chainId": 11155111,
 *   "blockExplorer": "https://sepolia.etherscan.io",
 *   "deployedAt": "2026-07-04"
 * }
 *
 * v2 (2026-07-04): redeploy tras auditoría interna — notifyRewardAmount ahora exige
 * stakers (fix del goteo huérfano de v1) y el deploy ancla 1 PULSO antes de fondear.
 * v1 deprecada: 0xb432...3c0A / 0x5C85...9936 (quedó con ~917 PULSO huérfanos, documentado).
 */
export const CHAIN_ID = 11155111

export const BLOCK_EXPLORER_URL = 'https://sepolia.etherscan.io'

export const CONTRACT_ADDRESSES = {
  PulsoToken: '0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75',
  PulsoStaking: '0x6006EA579603439e22fb090bD5233f1f6fba06df',
} as const satisfies Record<string, `0x${string}`>

/** Link a Etherscan (Sepolia) para una tx confirmada. */
export function etherscanTxUrl(hash: string): string {
  return `${BLOCK_EXPLORER_URL}/tx/${hash}`
}

/** Link a Etherscan (Sepolia) para una address (contrato o wallet). */
export function etherscanAddressUrl(address: string): string {
  return `${BLOCK_EXPLORER_URL}/address/${address}`
}
