import type { JSX, ReactNode } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { IconShield, IconWarning, IconWallet } from '../components/icons/Icon'
import { useSetPageContext } from '../context/AIContext'
import { BLOCK_EXPLORER_URL, CONTRACT_ADDRESSES, etherscanAddressUrl } from '../contracts/addresses'

/** Keys de traducción de las 5 acciones firmadas -- ver `security.signedActions.*`. */
const SIGNED_ACTION_KEYS = ['faucet', 'approve', 'stake', 'claim', 'unstake'] as const

/** Keys de traducción de la lista "PULSO nunca te pide" -- ver `security.neverAsks.item*`. */
const NEVER_ASKS_KEYS = ['item1', 'item2', 'item3', 'item4', 'item5'] as const

function SectionHeading({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-violet/10 p-1.5 text-violet">{icon}</span>
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      </div>
      <p className="max-w-2xl text-sm text-text-secondary">{children}</p>
    </div>
  )
}

function ContractRow({ name, address }: { name: string; address: string }): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-2/40 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{name}</p>
        <p className="truncate font-mono text-xs text-text-tertiary">{address}</p>
      </div>
      <a
        href={etherscanAddressUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-sm font-medium text-violet underline-offset-2 hover:underline"
      >
        {t('common.viewOnEtherscan')}
      </a>
    </div>
  )
}

export function Security(): JSX.Element {
  const { t } = useTranslation()
  useSetPageContext({ seccion: 'seguridad' })

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-violet/10 p-2 text-violet">
            <IconShield className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{t('security.title')}</h1>
        </div>
        <p className="max-w-2xl text-sm text-text-secondary">
          <Trans i18nKey="security.intro" components={{ strong: <strong className="text-text-primary" /> }} />
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="neutral" size="md">
            {t('security.badgeSepolia')}
          </Badge>
          <Badge variant="info" size="md">
            {t('security.badgeNonCustodial')}
          </Badge>
          <Badge variant="success" size="md">
            {t('security.badgePaperTrading')}
          </Badge>
        </div>
      </header>

      {/* --- Modelo non-custodial --- */}
      <section className="flex flex-col gap-4">
        <SectionHeading icon={<IconWallet className="h-4 w-4" />} title={t('security.custodialModel.heading')}>
          {t('security.custodialModel.desc')}
        </SectionHeading>
        <Card glow="none">
          <CardContent className="flex flex-col gap-3 text-sm text-text-secondary">
            <p>{t('security.custodialModel.p1')}</p>
            <p>{t('security.custodialModel.p2')}</p>
          </CardContent>
        </Card>
      </section>

      {/* --- Qué firmás --- */}
      <section className="flex flex-col gap-4">
        <SectionHeading icon={<IconShield className="h-4 w-4" />} title={t('security.signedActions.heading')}>
          {t('security.signedActions.desc')}
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIGNED_ACTION_KEYS.map((key) => (
            <Card key={key} glow="none" className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-text-primary">{t(`security.signedActions.${key}.action`)}</p>
              <p className="text-xs leading-relaxed text-text-tertiary">
                {t(`security.signedActions.${key}.what`)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* --- Qué PULSO nunca pide --- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-negative/30 bg-negative/10 px-4 py-4">
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-negative">{t('security.neverAsks.heading')}</p>
            <ul className="flex flex-col gap-1 text-sm text-negative/90">
              {NEVER_ASKS_KEYS.map((key) => (
                <li key={key} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{t(`security.neverAsks.${key}`)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-negative/80">{t('security.neverAsks.footer')}</p>
          </div>
        </div>
      </section>

      {/* --- Verificar los contratos --- */}
      <section className="flex flex-col gap-4">
        <SectionHeading icon={<IconShield className="h-4 w-4" />} title={t('security.verifyContracts.heading')}>
          {t('security.verifyContracts.desc')}
        </SectionHeading>
        <Card glow="none">
          <CardHeader>
            <div>
              <CardTitle>{t('security.verifyContracts.cardTitle')}</CardTitle>
              <CardDescription>{t('security.verifyContracts.cardDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ContractRow name="PulsoToken" address={CONTRACT_ADDRESSES.PulsoToken} />
            <ContractRow name="PulsoStaking" address={CONTRACT_ADDRESSES.PulsoStaking} />
          </CardContent>
        </Card>
        <Card glow="none">
          <CardContent className="flex flex-col gap-2 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">{t('security.verifyContracts.stepsTitle')}</p>
            <ol className="ml-4 flex list-decimal flex-col gap-1.5 text-text-tertiary">
              <li>{t('security.verifyContracts.step1')}</li>
              <li>
                {t('security.verifyContracts.step2a')}{' '}
                <span className="text-text-secondary">{t('security.verifyContracts.step2b')}</span>
                {t('security.verifyContracts.step2c')}
              </li>
              <li>{t('security.verifyContracts.step3')}</li>
              <li>
                {t('security.verifyContracts.step4a')}{' '}
                <span className="text-text-secondary">{t('security.verifyContracts.step4b')}</span>{' '}
                {t('security.verifyContracts.step4c')}
              </li>
            </ol>
            <p className="pt-1 text-xs text-text-muted">
              {t('security.verifyContracts.explorerUsed')}{' '}
              <a href={BLOCK_EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-text-secondary">{BLOCK_EXPLORER_URL}</a>
            </p>
          </CardContent>
        </Card>
      </section>

      {/* --- Disclaimers --- */}
      <section className="flex flex-col gap-3">
        <SectionHeading icon={<IconWarning className="h-4 w-4" />} title={t('security.disclaimers.heading')}>
          {t('security.disclaimers.desc')}
        </SectionHeading>

        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-200">
            <strong>{t('security.disclaimers.testnetTitle')}</strong> {t('security.disclaimers.testnetBody')}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3">
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
          <p className="text-sm font-medium text-negative">
            <strong>{t('security.disclaimers.paperTitle')}</strong> {t('security.disclaimers.paperBody')}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-violet/30 bg-violet/10 px-4 py-3">
          <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
          <p className="text-sm text-violet">
            <strong>{t('security.disclaimers.aiTitle')}</strong> {t('security.disclaimers.aiBody')}
          </p>
        </div>

        <p className="pt-2 text-xs leading-relaxed text-text-muted">{t('security.disclaimers.footer')}</p>
      </section>
    </div>
  )
}

export default Security
