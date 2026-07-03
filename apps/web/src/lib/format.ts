/**
 * Formateadores numéricos compartidos por el módulo Mercado (tabla + detalle).
 * Todo lo que es plata/porcentaje pasa por acá para no repetir reglas de
 * precisión entre `Market.tsx` y `CoinDetail.tsx`.
 */

/** Precio USD con precisión adaptativa: más decimales cuanto más chico el valor (altcoins/shitcoins). */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const abs = Math.abs(value)
  const digits = abs === 0 ? 2 : abs < 0.01 ? 6 : abs < 1 ? 4 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** Market cap / volumen: notación compacta (1.2B, 340M) — números demasiado grandes para mostrar enteros. */
export function formatCompactUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

/** Peso argentino sin decimales — cotizaciones MEP/CCL/USDT-ARS no necesitan centavos. */
export function formatArs(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Porcentaje sin signo (el signo lo da el color/ícono en quien lo consume). */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))}%`
}
