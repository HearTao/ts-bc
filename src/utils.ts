import { OpCode } from './opcode'
import { Value } from './value'

export function assertValue(v: OpCode | Value): Value {
  if (typeof v === 'number') {
    throw new Error(`${v} is value`)
  }
  return v
}

export function assertNumberValue(v: Value) {
  if (typeof v.value !== 'number') {
    throw new Error(`${v} is ${typeof v.value}`)
  }
  return v.value
}

export function assertStringValue(v: Value) {
  if (typeof v.value !== 'string') {
    throw new Error(`${v} is ${typeof v.value}`)
  }
  return v.value
}
