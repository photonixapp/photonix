/**
 * Extract error message from TanStack Form errors array.
 * Handles both string errors and Zod error objects.
 */
export function getErrorMessage(errors: unknown[] | undefined): string | undefined {
  if (!errors || errors.length === 0) return undefined
  const error = errors[0]
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message
  }
  return undefined
}
