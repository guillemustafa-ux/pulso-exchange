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
 *   "PulsoToken": "0xb432281F4aD976253630792E4931a4D084B33c0A",
 *   "PulsoStaking": "0x5C850800beD6E58F52F9F2721705D6675f1A9936",
 *   "network": "sepolia",
 *   "chainId": 11155111,
 *   "blockExplorer": "https://sepolia.etherscan.io",
 *   "deployedAt": "2026-07-03"
 * }
 */
export const CHAIN_ID = 11155111

export const BLOCK_EXPLORER_URL = 'https://sepolia.etherscan.io'

export const CONTRACT_ADDRESSES = {
  PulsoToken: '0xb432281F4aD976253630792E4931a4D084B33c0A',
  PulsoStaking: '0x5C850800beD6E58F52F9F2721705D6675f1A9936',
} as const satisfies Record<string, `0x${string}`>

/** Link a Etherscan (Sepolia) para una tx confirmada. */
export function etherscanTxUrl(hash: string): string {
  return `${BLOCK_EXPLORER_URL}/tx/${hash}`
}

/** Link a Etherscan (Sepolia) para una address (contrato o wallet). */
export function etherscanAddressUrl(address: string): string {
  return `${BLOCK_EXPLORER_URL}/address/${address}`
}
