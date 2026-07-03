import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'

/**
 * Project id de WalletConnect Cloud (https://cloud.reown.com) — identifica la
 * app ante los wallets que se conectan vía WalletConnect (QR/mobile). PULSO es
 * un demo de portfolio: si no se define `VITE_WALLETCONNECT_PROJECT_ID` en un
 * `.env`, cae a un placeholder. Conectores inyectados (MetaMask, Rabby, etc.)
 * funcionan igual sin un id real; solo el flujo WalletConnect/QR lo necesita.
 */
const projectId: string = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'pulso-exchange-demo'

/**
 * Config de wagmi/RainbowKit. Sepolia es la única chain habilitada: PULSO
 * corre exclusivamente contra los contratos deployados ahí (ver
 * `src/contracts/addresses.ts`), no tiene sentido ofrecer mainnet u otras
 * L2 todavía.
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'PULSO Exchange',
  appDescription: 'Exchange non-custodial de demostración — Sepolia Testnet',
  projectId,
  chains: [sepolia],
})
