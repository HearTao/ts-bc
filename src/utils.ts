import { OpCode, OpValue } from './opcode'

export function assertOPValue(v: OpCode | OpValue): number {
  if (typeof v === 'number') {
    throw new Error(`${v} is value`)
  }
  return v.value
}

export function assertOPCode(v: OpCode | OpValue): OpCode {
  if (typeof v !== 'number') {
    throw new Error(`${v} is not value`)
  }
  return v
}

export function assertNever(_v: never): never {
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

export function last<T>(items: T[]): T {
  if (!items.length) {
    throw new Error('out of range')
  }
  return items[items.length - 1]
}

export function fromEntries<K extends keyof any, V>(
  arr: [K, V][]
): Record<K, V> {
  return arr.reduce(
    (prev, [k, v]) => {
      prev[k] = v
      return prev
    },
    {} as Record<K, V>
  )
}
