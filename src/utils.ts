import { OpCode, OpValue } from './opcode'
import { ObjectFile } from './types'
import { ConstantValue } from './value'

export function isOpCode(v: OpCode | OpValue): v is OpCode {
  return typeof v === 'number'
}

export function assertOPValue(v: OpCode | OpValue): number {
  if (isOpCode(v)) {
    throw new Error(`${v} is not value`)
  }
  return v.value
}

export function assertOPCode(v: OpCode | OpValue): OpCode {
  if (!isOpCode(v)) {
    throw new Error(`${v} is value`)
  }
  return v
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

export function link(objectFiles: ObjectFile[]): ObjectFile {
  if (objectFiles.length === 1) {
    return objectFiles[0]
  }

  let resultOp: (OpCode | OpValue)[] = []
  let resultValue: ConstantValue[] = []

  for (const objectFile of objectFiles) {
    const [op, value] = objectFile
    const currentOp: (OpCode | OpValue)[] = []

    for (const o of op) {
      if (isOpCode(o)) {
        currentOp.push(o)
      } else {
        let value = o
        switch (o.kind) {
          case 'normal': {
            value = o
            break
          }
          case 'label': {
            value = { value: resultOp.length + o.value, kind: o.kind }
            break
          }
          case 'constant': {
            value = { value: resultValue.length + o.value, kind: o.kind }
            break
          }
        }
        currentOp.push(value)
      }
    }

    resultOp = resultOp.concat(currentOp)
    resultValue = resultValue.concat(value)
  }

  return [resultOp, resultValue]
}
