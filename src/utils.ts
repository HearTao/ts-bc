import { OpCode, OpValue } from './opcode'

export function assertOPValue(v: OpCode | OpValue): number {
  if (typeof v === 'number') {
    throw new Error(`${v} is value`)
  }
  return v.value
}

export function assertNever(v: never): never {
  return undefined!
}

export function isDef<T>(v: T | undefined | null): v is T {
  return v !== undefined && v !== null
}

export function assertDef<T>(v: T | undefined | null): T {
  if (!isDef(v)) {
    throw new Error('must be define')
  }
  return v
}

export function findRight<T, U extends T>(
  items: T[],
  cb: (v: T) => v is U
): U | undefined {
  for (let i = items.length - 1; i >= 0; --i) {
    const item = items[i]
    if (cb(item)) {
      return item
    }
  }
  return undefined
}
