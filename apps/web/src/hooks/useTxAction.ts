import { useEffect, useState } from 'react'
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'

export type TxStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error'

/** Extrae un mensaje legible de un error de viem/wagmi (revert, rechazo del usuario, RPC, etc.). */
function toErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { shortMessage?: unknown; message?: unknown }
    if (typeof anyErr.shortMessage === 'string' && anyErr.shortMessage.length > 0) return anyErr.shortMessage
    if (typeof anyErr.message === 'string' && anyErr.message.length > 0) return anyErr.message
  }
  return 'Ocurrió un error inesperado. Probá de nuevo.'
}

/**
 * Envoltorio de `useWriteContract` + `useWaitForTransactionReceipt` con una
 * máquina de estados simple (`idle → pending → confirming → confirmed|error`)
 * y mensaje de error ya normalizado. Un hook por acción (faucet, approve,
 * stake, claim, exit) — así cada botón tiene su propio spinner/estado
 * independiente en vez de compartir uno global.
 */
export function useTxAction() {
  const { writeContractAsync, reset: resetWrite } = useWriteContract()
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined)
  const [status, setStatus] = useState<TxStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const receipt = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (!hash) return
    if (receipt.isSuccess) {
      setStatus('confirmed')
    } else if (receipt.isError) {
      setStatus('error')
      setErrorMessage(toErrorMessage(receipt.error))
    } else if (receipt.isLoading) {
      setStatus('confirming')
    }
  }, [hash, receipt.isSuccess, receipt.isError, receipt.isLoading, receipt.error])

  async function execute(params: Parameters<typeof writeContractAsync>[0]): Promise<void> {
    setStatus('pending')
    setErrorMessage(null)
    try {
      const txHash = await writeContractAsync(params)
      setHash(txHash)
    } catch (err) {
      setStatus('error')
      setErrorMessage(toErrorMessage(err))
    }
  }

  function reset(): void {
    setStatus('idle')
    setErrorMessage(null)
    setHash(undefined)
    resetWrite()
  }

  return { execute, status, hash, errorMessage, reset }
}
