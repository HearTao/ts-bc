import { OpCode } from './opcode'
import { Value } from './value'
import { assertValue, assertNumberValue, assertStringValue } from './utils'
import {
  VMDump,
  DoneResult,
  ExecResult,
  Environment,
  EnvironmentType
} from './types'

export default class VirtualMachine {
  private stack: Value[] = []
  private environments: Environment[] = [
    {
      type: EnvironmentType.global,
      valueTable: new Map()
    }
  ]

  constructor(
    private codes: (OpCode | Value)[] = [],
    private values: Value[] = [],
    private cur: number = 0
  ) {}

  private popStack() {
    const value = this.stack.pop()
    if (!value) throw new Error('no value')
    return value
  }

  private popCode() {
    const code = this.codes[this.cur++]
    if (!code) throw new Error('no code')
    return assertValue(code)
  }

  private lookup(name: string) {
    for (let i = this.environments.length - 1; i >= 0; i--) {
      const env = this.environments[i]
      if (env.valueTable.has(name)) {
        return env.valueTable.get(name)!
      }
    }
    throw new Error('cannot find name ' + name)
  }

  private define(name: string, value: Value, type: EnvironmentType) {
    for (let i = this.environments.length - 1; i >= 0; i--) {
      const env = this.environments[i]
      if (
        type !== EnvironmentType.block &&
        env.type === EnvironmentType.block
      ) {
        continue
      }
      env.valueTable.set(name, value)
      return
    }
  }

  private setValue(name: string, value: Value) {
    for (let i = this.environments.length - 1; i >= 0; i--) {
      const env = this.environments[i]
      if (env.valueTable.has(name)) {
        env.valueTable.set(name, value)
        return
      }
    }
    throw new Error('cannot find name ' + name)
  }

  dump(): VMDump {
    return {
      stack: this.stack,
      environments: this.environments,
      codes: this.codes,
      values: this.values,
      cur: this.cur
    }
  }

  load(dump: VMDump) {
    this.stack = dump.stack
    this.environments = dump.environments
    this.codes = dump.codes
    this.values = dump.values
    this.cur = dump.cur
  }

  step(): DoneResult {
    return this.exec()
  }

  exec(step: true): ExecResult
  exec(step?: false): DoneResult
  exec(step?: boolean): ExecResult {
    const { codes, stack, environments } = this
    main: while (this.cur < codes.length) {
      const op = codes[this.cur++]

      switch (op) {
        case OpCode.Const:
          stack.push(this.values[assertNumberValue(this.popCode())])
          break
        case OpCode.Add: {
          const right = this.popStack()
          const left = this.popStack()
          stack.push({
            value: assertNumberValue(left) + assertNumberValue(right)
          })
          break
        }
        case OpCode.Sub: {
          const right = this.popStack()
          const left = this.popStack()
          stack.push({
            value: assertNumberValue(left) - assertNumberValue(right)
          })
          break
        }
        case OpCode.Mul: {
          const right = this.popStack()
          const left = this.popStack()
          stack.push({
            value: assertNumberValue(left) * assertNumberValue(right)
          })
          break
        }
        case OpCode.Div: {
          const right = this.popStack()
          const left = this.popStack()
          stack.push({
            value: assertNumberValue(left) / assertNumberValue(right)
          })
          break
        }

        case OpCode.LT: {
          const right = this.popStack()
          const left = this.popStack()
          stack.push({ value: left.value < right.value })
          break
        }

        case OpCode.GT: {
          const right = this.popStack()
          const left = this.popStack()
          stack.push({ value: left.value > right.value })
          break
        }

        case OpCode.Jump: {
          this.cur = assertNumberValue(this.popCode())
          break
        }

        case OpCode.JumpIfFalse: {
          const cond = this.popStack()
          const pos = assertNumberValue(this.popCode())
          if (!cond.value) {
            this.cur = pos
          }
          break
        }

        case OpCode.Push: {
          stack.push(assertValue(this.popCode()))
          break
        }
        case OpCode.Def: {
          const initializer = this.popStack()
          const name = this.popStack()
          this.define(
            assertStringValue(name),
            initializer,
            EnvironmentType.lexer
          )
          break
        }
        case OpCode.DefBlock: {
          const initializer = this.popStack()
          const name = this.popStack()
          this.define(
            assertStringValue(name),
            initializer,
            EnvironmentType.block
          )
          break
        }
        case OpCode.Load: {
          const name = this.popStack()
          const value = this.lookup(assertStringValue(name))
          stack.push(value)
          break
        }
        case OpCode.Set: {
          const name = this.popStack()
          const value = this.popStack()
          this.setValue(assertStringValue(name), value)
          break
        }

        case OpCode.EnterBlockScope: {
          this.environments.push({
            type: EnvironmentType.block,
            valueTable: new Map()
          })
          break
        }

        case OpCode.ExitBlockScope: {
          this.environments.pop()
          break
        }

        case OpCode.Eof:
          break main
        default:
          throw new Error('unexpected op: ' + op)
      }

      if (step) {
        return {
          finished: false
        }
      }
    }

    return {
      finished: true,
      value: this.popStack()
    }
  }
}
