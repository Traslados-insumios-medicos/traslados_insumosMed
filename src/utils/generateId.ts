export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  const timestamp = Date.now().toString(36).slice(-4)
  return `${prefix}-${timestamp}${random}`
}

