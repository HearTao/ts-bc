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