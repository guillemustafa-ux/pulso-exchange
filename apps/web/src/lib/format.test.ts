import { describe, expect, it } from 'vitest'
import { formatArs, formatCompactUsd, formatPercent, formatUsd } from './format'

describe('formatUsd — precisión adaptativa', () => {
  it('2 decimales para valores >= 1', () => {
    expect(formatUsd(50000)).toBe('$50,000.00')
  })

  it('4 decimales bajo 1, 6 bajo 0.01 (altcoins)', () => {
    expect(formatUsd(0.5)).toBe('$0.5000')
    expect(formatUsd(0.001234)).toBe('$0.001234')
  })

  it('cero usa 2 decimales', () => {
    expect(formatUsd(0)).toBe('$0.00')
  })

  it('null/undefined/NaN muestran em-dash', () => {
    expect(formatUsd(null)).toBe('—')
    expect(formatUsd(undefined)).toBe('—')
    expect(formatUsd(Number.NaN)).toBe('—')
  })
})

describe('formatCompactUsd', () => {
  it('notación compacta para números grandes', () => {
    expect(formatCompactUsd(1_230_000_000)).toBe('$1.23B')
    expect(formatCompactUsd(340_000_000)).toBe('$340M')
  })
})

describe('formatArs', () => {
  it('pesos sin decimales, agrupado es-AR', () => {
    // Intl es-AR usa espacio no separable después de "$" y punto de miles.
    expect(formatArs(1234567).replace(/ /g, ' ')).toBe('$ 1.234.567')
  })

  it('null muestra em-dash', () => {
    expect(formatArs(null)).toBe('—')
  })
})

describe('formatPercent', () => {
  it('siempre 2 decimales y sin signo (el signo lo pone el consumidor)', () => {
    expect(formatPercent(-3.456)).toBe('3.46%')
    expect(formatPercent(2.5)).toBe('2.50%')
  })

  it('null muestra em-dash', () => {
    expect(formatPercent(null)).toBe('—')
  })
})
