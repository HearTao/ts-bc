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