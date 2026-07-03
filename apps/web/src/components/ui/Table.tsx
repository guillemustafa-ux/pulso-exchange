import { useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { PulseIcon } from '../icons/PulseIcon'
import { IconSearch, IconSort, IconChevronLeft, IconChevronRight } from '../icons/Icon'
import { Skeleton } from './Skeleton'

export interface Column<T> {
  /** Identificador único de columna (no necesita ser una key de T). */
  key: string
  header: string
  /** Cómo renderizar la celda. */
  cell: (row: T) => ReactNode
  /** Si se define, la columna se puede ordenar por este valor. */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  headerClassName?: string
  cellClassName?: string
  /** Ancho fijo opcional (ej. `'80px'`, `'12ch'`). */
  width?: string
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

type SearchProps<T> =
  | { searchable: true; getSearchText: (row: T) => string; searchPlaceholder?: string }
  | { searchable?: false; getSearchText?: never; searchPlaceholder?: never }

export type TableProps<T> = SearchProps<T> & {
  data: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  loading?: boolean
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right tabular-nums',
  center: 'text-center',
}

/**
 * Tabla de datos de PULSO: orden por columna, búsqueda, paginación y un
 * estado vacío que usa el mismo motivo de "flatline" que el resto de la
 * marca (PulseIcon variant="flat") en vez de un mensaje gris genérico.
 */
export function Table<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  loading = false,
  pageSize = 10,
  searchable,
  getSearchText,
  searchPlaceholder = 'Buscar...',
  emptyTitle = 'Sin datos',
  emptyDescription = 'Todavía no hay nada para mostrar acá.',
  className,
}: TableProps<T>): JSX.Element {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!searchable || !getSearchText || query.trim() === '') return data
    const q = query.trim().toLowerCase()
    return data.filter((row) => getSearchText(row).toLowerCase().includes(q))
  }, [data, searchable, getSearchText, query])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return filtered
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = column.sortValue!(a)
      const bv = column.sortValue!(b)
      if (av === bv) return 0
      return av > bv ? dir : -dir
    })
  }, [filtered, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  function handleSort(column: Column<T>): void {
    if (!column.sortValue) return
    setPage(1)
    setSort((prev) => {
      if (prev?.key !== column.key) return { key: column.key, direction: 'asc' }
      if (prev.direction === 'asc') return { key: column.key, direction: 'desc' }
      return null
    })
  }

  function handleSearch(value: string): void {
    setQuery(value)
    setPage(1)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {searchable && (
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              'h-9 w-full rounded-md border border-border-subtle bg-surface-2/70 pl-9 pr-3 text-sm text-text-primary',
              'placeholder:text-text-muted outline-none transition-colors duration-200',
              'focus:border-border-focus focus:shadow-focus-ring',
            )}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default">
              {columns.map((column) => {
                const isSorted = sort?.key === column.key
                return (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-tertiary',
                      ALIGN_CLASS[column.align ?? 'left'],
                      column.headerClassName,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={cn(
                          'inline-flex items-center gap-1 uppercase tracking-wide text-text-tertiary',
                          'transition-colors duration-150 hover:text-text-primary',
                          isSorted && 'text-text-primary',
                          column.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {column.header}
                        <IconSort state={isSorted ? sort.direction : 'none'} className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 6) }, (_, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <Skeleton variant="text" className="w-full max-w-[10rem]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
                    <div>
                      <p className="font-display text-sm font-medium text-text-secondary">{emptyTitle}</p>
                      <p className="mt-1 text-xs text-text-muted">{emptyDescription}</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-border-subtle last:border-0 transition-colors duration-150',
                    onRowClick && 'cursor-pointer hover:bg-surface-2/50',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-3 text-text-primary', ALIGN_CLASS[column.align ?? 'left'], column.cellClassName)}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
          <span className="tabular-nums">
            Página {safePage} de {totalPages} · {sorted.length} resultados
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-secondary transition-colors duration-150 hover:border-border-emphasis hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Página anterior"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-secondary transition-colors duration-150 hover:border-border-emphasis hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Página siguiente"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
