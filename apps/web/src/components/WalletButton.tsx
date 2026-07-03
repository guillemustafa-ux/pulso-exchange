import type { JSX } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'
import { IconWallet } from './icons/Icon'

/**
 * Botón de wallet real (RainbowKit), reemplaza el placeholder visual del
 * Día 1 en el header. Usa `ConnectButton.Custom` para mantener el look del
 * design system (`Button` secondary) en vez del botón default de RainbowKit;
 * el modal de conexión/cuenta sigue siendo el de RainbowKit (temeado en
 * `main.tsx` con `darkTheme` + acento violeta).
 *
 * Estado conectado: `account.displayName` ya resuelve a ENS si existe, o a
 * la address truncada (`0x1234…abcd`) si no.
 */
export function WalletButton({ className }: { className?: string }): JSX.Element {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready && !!account && !!chain && (!authenticationStatus || authenticationStatus === 'authenticated')

        return (
          <div
            className={className}
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={openConnectModal}>
                    <IconWallet className="h-4 w-4" />
                    <span className="hidden sm:inline">Conectar wallet</span>
                    <span className="sm:hidden">Conectar</span>
                  </Button>
                )
              }

              if (chain?.unsupported) {
                return (
                  <Button variant="danger" size="sm" onClick={openChainModal}>
                    Red incorrecta
                  </Button>
                )
              }

              return (
                <Button variant="secondary" size="sm" className="gap-2" onClick={openAccountModal}>
                  <span className={cn('inline-flex h-1.5 w-1.5 shrink-0 rounded-full', 'bg-positive')} />
                  {account.displayName}
                </Button>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

export default WalletButton
