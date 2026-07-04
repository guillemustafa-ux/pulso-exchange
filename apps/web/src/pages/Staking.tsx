import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useReadContract, useSwitchChain } from 'wagmi'
import { formatUnits, maxUint256, parseUnits } from 'viem'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { WalletButton } from '../components/WalletButton'
import { IconStaking, IconWallet } from '../components/icons/Icon'
import { useTxAction } from '../hooks/useTxAction'
import { useSetPageContext } from '../context/AIContext'
import { CHAIN_ID, CONTRACT_ADDRESSES, etherscanTxUrl } from '../contracts/addresses'
import { PulsoTokenAbi } from '../contracts/abi/PulsoToken'
import { PulsoStakingAbi } from '../contracts/abi/PulsoStaking'

const TOKEN = { address: CONTRACT_ADDRESSES.PulsoToken, abi: PulsoTokenAbi } as const
const STAKING = { address: CONTRACT_ADDRESSES.PulsoStaking, abi: PulsoStakingAbi } as const

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatToken(value: bigint | undefined, digits = 4): string {
  if (value === undefined) return '—'
  const n = Number(formatUnits(value, 18))
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n)
}

function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/** Reloj de 1s compartido por todos los countdowns de la página. */
function useNowTick(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Spinner mientras la tx está pending/confirmando, link a Etherscan al confirmar, error legible. */
function TxStatusLine({ tx }: { tx: ReturnType<typeof useTxAction> }): JSX.Element | null {
  const { t } = useTranslation()
  if (tx.status === 'idle') return null

  if (tx.status === 'pending' || tx.status === 'confirming') {
    return (
      <p className="flex items-center gap-2 text-xs text-text-tertiary">
        <Spinner size="sm" color="violet" label={t('staking.tx.processing')} />
        {tx.status === 'pending' ? t('staking.tx.signInWallet') : t('staking.tx.waitingConfirmation')}
      </p>
    )
  }

  if (tx.status === 'confirmed' && tx.hash) {
    return (
      <p className="text-xs text-positive">
        {t('staking.tx.confirmed')}{' '}
        <a
          href={etherscanTxUrl(tx.hash)}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-text-primary"
        >
          {t('staking.tx.viewOnEtherscan')}
        </a>
      </p>
    )
  }

  if (tx.status === 'error') {
    return <p className="text-xs text-negative">{tx.errorMessage}</p>
  }

  return null
}

// ---------------------------------------------------------------------------
// Panel sin wallet conectada
// ---------------------------------------------------------------------------

function ConnectPanel(): JSX.Element {
  const { t } = useTranslation()
  return (
    <Card glow="violet" className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
      <div className="rounded-full bg-violet/10 p-3 text-violet">
        <IconWallet className="h-6 w-6" />
      </div>
      <div>
        <h2 className="font-display text-lg font-medium text-text-primary">{t('staking.connect.title')}</h2>
        <p className="mt-1 max-w-xs text-sm text-text-tertiary">{t('staking.connect.desc')}</p>
      </div>
      <WalletButton />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Faucet
// ---------------------------------------------------------------------------

function FaucetSection(): JSX.Element {
  const { t } = useTranslation()
  const { address } = useAccount()
  const now = useNowTick()
  const tx = useTxAction()

  const { data: faucetAmount } = useReadContract({ ...TOKEN, functionName: 'FAUCET_AMOUNT' })
  const { data: cooldownSeconds } = useReadContract({ ...TOKEN, functionName: 'FAUCET_COOLDOWN' })
  const {
    data: lastClaim,
    refetch: refetchLastClaim,
  } = useReadContract({
    ...TOKEN,
    functionName: 'lastClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { refetch: refetchBalance } = useReadContract({
    ...TOKEN,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  useEffect(() => {
    if (tx.status === 'confirmed') {
      void refetchLastClaim()
      void refetchBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.status])

  const nextClaimAt =
    lastClaim !== undefined && cooldownSeconds !== undefined ? Number(lastClaim) + Number(cooldownSeconds) : 0
  const remaining = nextClaimAt - now
  const onCooldown = remaining > 0
  const isBusy = tx.status === 'pending' || tx.status === 'confirming'
  const cooldownHours = cooldownSeconds !== undefined ? Math.round(Number(cooldownSeconds) / 3600) : 24

  async function handleClaim(): Promise<void> {
    if (!address) return
    await tx.execute({ ...TOKEN, functionName: 'faucet' })
  }

  return (
    <Card glow="violet">
      <CardHeader>
        <div>
          <CardTitle>{t('staking.faucet.title')}</CardTitle>
          <CardDescription>{t('staking.faucet.desc', { hours: cooldownHours })}</CardDescription>
        </div>
        <Badge variant="info" size="sm">
          {t('staking.sepoliaBadge')}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
          {formatToken(faucetAmount, 0)} <span className="text-sm font-normal text-text-tertiary">PULSO</span>
        </p>
        {address && onCooldown && (
          <p className="text-sm text-text-tertiary">
            {t('staking.faucet.nextClaim')}{' '}
            <span className="tabular-nums text-text-secondary">{formatCountdown(remaining)}</span>
          </p>
        )}
        <TxStatusLine tx={tx} />
      </CardContent>
      <CardFooter>
        <Button
          variant="primary"
          className="w-full"
          loading={isBusy}
          disabled={!address || onCooldown}
          onClick={handleClaim}
        >
          {t('staking.faucet.claim')}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Stake
// ---------------------------------------------------------------------------

function StakeSection(): JSX.Element {
  const { t } = useTranslation()
  const { address } = useAccount()
  const [amountInput, setAmountInput] = useState('')
  const approveTx = useTxAction()
  const stakeTx = useTxAction()

  const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
    ...TOKEN,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    ...TOKEN,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.PulsoStaking] : undefined,
    query: { enabled: !!address },
  })
  const { data: stakedBalance, refetch: refetchStakedBalance } = useReadContract({
    ...STAKING,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { refetch: refetchTotalSupply } = useReadContract({ ...STAKING, functionName: 'totalSupply' })

  const parsedAmount = useMemo<bigint | null>(() => {
    if (!amountInput) return null
    try {
      const value = parseUnits(amountInput, 18)
      return value > 0n ? value : null
    } catch {
      return null
    }
  }, [amountInput])

  // allowance === undefined significa "cargando", no "sin allowance": mostrar el
  // botón de approve en ese estado invita a firmar un approve innecesario.
  const allowanceLoading = parsedAmount !== null && allowance === undefined
  const needsApproval = parsedAmount !== null && allowance !== undefined && allowance < parsedAmount
  const exceedsBalance = parsedAmount !== null && walletBalance !== undefined && parsedAmount > walletBalance

  useEffect(() => {
    if (approveTx.status === 'confirmed') void refetchAllowance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTx.status])

  useEffect(() => {
    if (stakeTx.status === 'confirmed') {
      void refetchWalletBalance()
      void refetchStakedBalance()
      void refetchAllowance()
      void refetchTotalSupply()
      setAmountInput('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakeTx.status])

  async function handleApprove(): Promise<void> {
    if (!parsedAmount) return
    await approveTx.execute({
      ...TOKEN,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.PulsoStaking, maxUint256],
    })
  }

  async function handleStake(): Promise<void> {
    if (!parsedAmount) return
    await stakeTx.execute({ ...STAKING, functionName: 'stake', args: [parsedAmount] })
  }

  function handleMax(): void {
    if (walletBalance === undefined) return
    setAmountInput(formatUnits(walletBalance, 18))
  }

  const activeTx = needsApproval ? approveTx : stakeTx
  const isBusy = activeTx.status === 'pending' || activeTx.status === 'confirming'

  return (
    <Card glow="magenta">
      <CardHeader>
        <div>
          <CardTitle>{t('staking.stake.title')}</CardTitle>
          <CardDescription>{t('staking.stake.desc')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-text-tertiary">
          <span>
            {t('staking.stake.available')}{' '}
            <span className="tabular-nums text-text-secondary">{formatToken(walletBalance)} PULSO</span>
          </span>
          <span>
            {t('staking.stake.staked')}{' '}
            <span className="tabular-nums text-text-secondary">{formatToken(stakedBalance)} PULSO</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ''))}
            disabled={!address}
            className="h-10 w-full rounded-md border border-border-default bg-surface-2/60 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none disabled:opacity-40"
          />
          <Button variant="secondary" size="sm" onClick={handleMax} disabled={!address}>
            {t('staking.stake.max')}
          </Button>
        </div>
        {exceedsBalance && <p className="text-xs text-negative">{t('staking.stake.insufficientBalance')}</p>}
        <TxStatusLine tx={activeTx} />
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {needsApproval ? (
          <>
            <Button
              variant="primary"
              className="w-full"
              loading={isBusy}
              disabled={!address || !parsedAmount || exceedsBalance}
              onClick={handleApprove}
            >
              {t('staking.stake.approve')}
            </Button>
            <p className="text-center text-[11px] leading-snug text-text-muted">{t('staking.stake.approveNote')}</p>
          </>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            loading={isBusy || allowanceLoading}
            disabled={!address || !parsedAmount || exceedsBalance || allowanceLoading}
            onClick={handleStake}
          >
            {t('staking.stake.stakeBtn')}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Claim + Exit
// ---------------------------------------------------------------------------

function ClaimSection(): JSX.Element {
  const { t } = useTranslation()
  const { address } = useAccount()
  const now = useNowTick()
  const claimTx = useTxAction()
  const exitTx = useTxAction()

  const { data: earned, refetch: refetchEarned } = useReadContract({
    ...STAKING,
    functionName: 'earned',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  })
  const { data: rewardRate } = useReadContract({ ...STAKING, functionName: 'rewardRate', query: { refetchInterval: 30_000 } })
  const { data: totalSupply } = useReadContract({ ...STAKING, functionName: 'totalSupply', query: { refetchInterval: 30_000 } })
  const { data: periodFinish } = useReadContract({ ...STAKING, functionName: 'periodFinish' })
  const { data: stakedBalance, refetch: refetchStakedBalance } = useReadContract({
    ...STAKING,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { refetch: refetchWalletBalance } = useReadContract({
    ...TOKEN,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const apr = useMemo<number | null>(() => {
    if (rewardRate === undefined || totalSupply === undefined || periodFinish === undefined) return null
    if (totalSupply === 0n) return null
    if (Number(periodFinish) <= now) return 0
    const rate = Number(formatUnits(rewardRate, 18))
    const supply = Number(formatUnits(totalSupply, 18))
    return (rate * SECONDS_PER_YEAR * 100) / supply
  }, [rewardRate, totalSupply, periodFinish, now])

  useEffect(() => {
    if (claimTx.status === 'confirmed') void refetchEarned()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimTx.status])

  useEffect(() => {
    if (exitTx.status === 'confirmed') {
      void refetchEarned()
      void refetchStakedBalance()
      void refetchWalletBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitTx.status])

  async function handleClaim(): Promise<void> {
    await claimTx.execute({ ...STAKING, functionName: 'claim' })
  }

  async function handleExit(): Promise<void> {
    await exitTx.execute({ ...STAKING, functionName: 'exit' })
  }

  const hasEarned = earned !== undefined && earned > 0n
  const hasStake = stakedBalance !== undefined && stakedBalance > 0n
  const claimBusy = claimTx.status === 'pending' || claimTx.status === 'confirming'
  const exitBusy = exitTx.status === 'pending' || exitTx.status === 'confirming'

  const aprLabel =
    apr === null ? '—' : apr === 0 ? t('staking.rewards.noActive') : t('staking.rewards.aprEst', { apr: apr.toFixed(2) })

  return (
    <Card glow="cyan">
      <CardHeader>
        <div>
          <CardTitle>{t('staking.rewards.title')}</CardTitle>
          <CardDescription>{aprLabel}</CardDescription>
        </div>
        <Badge variant="success" size="sm" live={hasEarned}>
          PULSO
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-display text-2xl font-semibold tabular-nums text-text-primary">
          {formatToken(earned, 6)}{' '}
          <span className="text-sm font-normal text-text-tertiary">{t('staking.rewards.pending')}</span>
        </p>
        <TxStatusLine tx={claimTx} />
        <TxStatusLine tx={exitTx} />
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 sm:flex-row">
        <Button
          variant="primary"
          className="w-full"
          loading={claimBusy}
          disabled={!address || !hasEarned}
          onClick={handleClaim}
        >
          {t('staking.rewards.claim')}
        </Button>
        <Button
          variant="danger"
          className="w-full"
          loading={exitBusy}
          disabled={!address || !hasStake}
          onClick={handleExit}
        >
          {t('staking.rewards.exit')}
        </Button>
      </CardFooter>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function Staking(): JSX.Element {
  const { t } = useTranslation()
  const { isConnected, address, chain } = useAccount()
  const { switchChain, isPending: switchPending } = useSwitchChain()

  // Los reads van por el transport de Sepolia siempre, pero los WRITES firman en
  // la chain de la wallet: sin este guard, un usuario en otra red ve los botones
  // habilitados y la transacción falla con un error críptico (o peor, firma en
  // la red equivocada).
  const wrongNetwork = isConnected && chain !== undefined && chain.id !== CHAIN_ID

  // Mismas queries de solo-lectura que ClaimSection -- wagmi/react-query las
  // dedupea por (contrato, función, args), no duplica el request RPC.
  const { data: stakedBalance } = useReadContract({
    ...STAKING,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: rewardRate } = useReadContract({ ...STAKING, functionName: 'rewardRate' })
  const { data: totalSupply } = useReadContract({ ...STAKING, functionName: 'totalSupply' })
  const { data: periodFinish } = useReadContract({ ...STAKING, functionName: 'periodFinish' })

  const apr = useMemo<number | null>(() => {
    if (rewardRate === undefined || totalSupply === undefined || periodFinish === undefined) return null
    if (totalSupply === 0n) return null
    if (Number(periodFinish) <= Math.floor(Date.now() / 1000)) return 0
    const rate = Number(formatUnits(rewardRate, 18))
    const supply = Number(formatUnits(totalSupply, 18))
    return (rate * SECONDS_PER_YEAR * 100) / supply
  }, [rewardRate, totalSupply, periodFinish])

  // Snapshot para el AIAssistant: APR estimado + posición del usuario, si hay wallet conectada.
  useSetPageContext({
    seccion: 'staking',
    wallet_conectada: isConnected,
    apr_estimado_pct: apr,
    balance_stakeado: stakedBalance !== undefined ? Number(formatUnits(stakedBalance, 18)) : null,
  })

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-violet/10 p-2 text-violet">
            <IconStaking className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{t('staking.title')}</h1>
        </div>
        <p className="max-w-2xl text-sm text-text-secondary">{t('staking.subtitle')}</p>
      </header>

      {!isConnected ? (
        <ConnectPanel />
      ) : wrongNetwork ? (
        <Card glow="magenta">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">
              {t('staking.wrongNetwork.message', { network: chain?.name ?? t('staking.wrongNetwork.otherNetwork') })}
            </p>
            <p className="max-w-md text-xs text-text-tertiary">{t('staking.wrongNetwork.detail')}</p>
            <Button
              variant="primary"
              loading={switchPending}
              onClick={() => switchChain({ chainId: CHAIN_ID })}
            >
              {t('staking.wrongNetwork.switch')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <FaucetSection />
          <StakeSection />
          <div className="lg:col-span-2">
            <ClaimSection />
          </div>
        </div>
      )}
    </div>
  )
}

export default Staking
