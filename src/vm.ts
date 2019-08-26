import { OpCode, OpValue } from './opcode'
import { assertOPValue } from './utils'
import {
  VMDump,
  DoneResult,
  ExecResult,
  Environment,
  EnvironmentType,
  StackFrame
} from './types'
import { VObject, JSNumber, JSBoolean } from './value'

export default class VirtualMachine {
  private stack: VObject[] = []
  private frames: StackFrame[] = []
  private environments: Environment[] = [
    {
      type: EnvironmentType.global,
      valueTable: new Map()
    }
  ]

  constructor(
    private codes: (OpCode | OpValue)[] = [],
    private values: VObject[] = [],
    private cur: number = 0
  ) {}

  private popStack() {
    const value = this.stack.pop()
    if (!value) {
      throw new Error('no value')
    }
    return value
  }

  private popCode() {
    const code = this.codes[this.cur++]
    if (!code) throw new Error('no code')
    return assertOPValue(code)
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

  private define(name: string, value: VObject, type: EnvironmentType) {
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

  private setValue(name: string, value: VObject) {
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
      frames: this.frames,
      environments: this.environments,
      codes: this.codes,
      values: this.values,
      cur: this.cur
    }
  }

  load(dump: VMDump) {
    this.stack = dump.stack
    this.frames = dump.frames
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
    main: while (this.cur < this.codes.length) {
      const op = this.codes[this.cur++]

      switch (op) {
        case OpCode.Const:
          this.stack.push(this.values[this.popCode()])
          break
        case OpCode.Add: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSNumber(left.toNumber().value + right.toNumber().value)
          )
          break
        }
        case OpCode.Sub: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSNumber(left.toNumber().value - right.toNumber().value)
          )
          break
        }
        case OpCode.Mul: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSNumber(left.toNumber().value * right.toNumber().value)
          )
          break
        }
        case OpCode.Div: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSNumber(left.toNumber().value / right.toNumber().value)
          )
          break
        }

        case OpCode.LT: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSBoolean(left.toNumber().value < right.toNumber().value)
          )
          break
        }

        case OpCode.GT: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSBoolean(left.toNumber().value > right.toNumber().value)
          )
          break
        }

        case OpCode.StrictEQ: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSBoolean(left.toNumber().value === right.toNumber().value)
          )
          break
        }

        case OpCode.StrictNEQ: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSBoolean(left.toNumber().value !== right.toNumber().value)
          )
          break
        }

        case OpCode.Jump: {
          this.cur = this.popCode()
          break
        }

        case OpCode.JumpIfFalse: {
          const cond = this.popStack()
          const pos = this.popCode()
          if (!cond.toBoolean().value) {
            this.cur = pos
          }
          break
        }

        case OpCode.Push: {
          this.stack.push(new JSNumber(this.popCode()))
          break
        }
        case OpCode.Def: {
          const name = this.popStack()
          const initializer = this.popStack()
          this.define(name.toString().value, initializer, EnvironmentType.lexer)
          break
        }
        case OpCode.DefBlock: {
          const name = this.popStack()
          const initializer = this.popStack()
          this.define(name.toString().value, initializer, EnvironmentType.block)
          break
        }
        case OpCode.Load: {
          const name = this.popStack()
          const value = this.lookup(name.toString().value)
          this.stack.push(value)
          break
        }
        case OpCode.Set: {
          const name = this.popStack()
          const value = this.popStack()
          this.setValue(name.toString().value, value)
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

        case OpCode.Call: {
          const call = this.popStack()
          const length = this.popStack()

          const stackFrame: StackFrame = {
            ret: this.cur,
            entry: this.stack.length,
            environments: {
              type: EnvironmentType.lexer,
              valueTable: new Map()
            }
          }

          this.frames.push(stackFrame)
          this.environments.push(
            this.frames[this.frames.length - 1].environments
          )

          this.cur = call.toNumber().value

          const args: VObject[] = []
          for (let i = 0; i < length.toNumber().value; ++i) {
            args.push(this.popStack())
          }

          args.forEach(x => this.stack.push(x))
          break
        }

        case OpCode.Ret: {
          const ret = this.popStack()
          const frame = this.frames.pop()!
          this.cur = frame.ret
          this.stack = this.stack.slice(0, frame.entry)
          this.stack.push(ret)
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
