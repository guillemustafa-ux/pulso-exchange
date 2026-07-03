import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'
import '@rainbow-me/rainbowkit/styles.css'
import './styles/globals.css'
import { wagmiConfig } from './lib/wagmi'
import App from './App.tsx'

const queryClient = new QueryClient()

/**
 * Tema del modal de RainbowKit: dark + acento violeta de marca (#8B5CF6),
 * a tono con el resto del design system (ver `src/tokens/index.ts`).
 */
const rainbowKitTheme = darkTheme({
  accentColor: '#8B5CF6',
  accentColorForeground: '#F5F3FF',
  borderRadius: 'medium',
  overlayBlur: 'small',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* `WagmiProvider` es el nombre vigente en wagmi v2 (`WagmiConfig` quedó
        como alias deprecado del mismo componente). */}
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme} initialChain={sepolia}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
