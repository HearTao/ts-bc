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
import {
  VObject,
  JSNumber,
  JSBoolean,
  JSArray,
  JSUndefined,
  JSNull,
  JSFunction,
  JSString,
  JSObject
} from './value'
import { initPrototype } from './bom'

export default class VirtualMachine {
  private stack: VObject[] = []
  private frames: StackFrame[] = []
  private environments: Environment[] = []

  constructor(
    private codes: (OpCode | OpValue)[] = [],
    private values: VObject[] = [],
    private cur: number = 0
  ) {
    this.initGlobal()
  }

  private initGlobal() {
    const valueTable = new Map<string, VObject>()
    this.environments.push({
      type: EnvironmentType.global,
      valueTable
    })

    initPrototype(valueTable)
  }

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
      if (env.type === EnvironmentType.lexer) {
        if (env.upValue.has(name)) {
          return env.upValue.get(name)!
        }
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
      if (env.type === EnvironmentType.lexer) {
        if (env.upValue.has(name)) {
          env.upValue.set(name, value)
          return
        }
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
            new JSNumber(left.asNumber().value + right.asNumber().value)
          )
          break
        }
        case OpCode.Sub: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSNumber(left.asNumber().value - right.asNumber().value)
          )
          break
        }
        case OpCode.Mul: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSNumber(left.asNumber().value * right.asNumber().value)
          )
          break
        }
        case OpCode.Div: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSNumber(left.asNumber().value / right.asNumber().value)
          )
          break
        }

        case OpCode.LT: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSBoolean(left.asNumber().value < right.asNumber().value)
          )
          break
        }

        case OpCode.GT: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSBoolean(left.asNumber().value > right.asNumber().value)
          )
          break
        }

        case OpCode.StrictEQ: {
          const right = this.popStack()
          const left = this.popStack()
          if (left.isNumber() && right.isNumber()) {
            this.stack.push(new JSBoolean(left.value === right.value))
          } else {
            this.stack.push(new JSBoolean(left === right))
          }
          break
        }

        case OpCode.StrictNEQ: {
          const right = this.popStack()
          const left = this.popStack()
          this.stack.push(
            new JSBoolean(left.asNumber().value !== right.asNumber().value)
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
          if (!cond.asBoolean().value) {
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
          this.define(name.asString().value, initializer, EnvironmentType.lexer)
          break
        }
        case OpCode.DefBlock: {
          const name = this.popStack()
          const initializer = this.popStack()
          this.define(name.asString().value, initializer, EnvironmentType.block)
          break
        }
        case OpCode.Load: {
          const name = this.popStack()
          const value = this.lookup(name.asString().value)
          this.stack.push(value)
          break
        }
        case OpCode.Set: {
          const name = this.popStack()
          const value = this.popStack()
          this.setValue(name.asString().value, value)
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

        case OpCode.CallMethod: {
          const idx = this.popStack()
          const obj = this.popStack()

          if (obj.isObject() && (idx.isNumber() || idx.isString())) {
            this.stack.push(obj.get(idx))
          } else {
            throw new Error('not supported index access')
          }

          const callee = this.popStack()
          const length = this.popStack()

          if (!callee.isObject() || !callee.isFunction()) {
            throw new Error('is not callable')
          }

          if (callee.isNative()) {
            const args: VObject[] = []
            for (let i = 0; i < length.asNumber().value; ++i) {
              args.push(this.popStack())
            }

            this.stack.push(callee.apply(args))
            break
          }

          const stackFrame: StackFrame = {
            ret: this.cur,
            entry: this.stack.length,
            environments: {
              type: EnvironmentType.lexer,
              valueTable: new Map(),
              upValue: callee.upvalue
            },
            thisObject: obj
          }

          this.frames.push(stackFrame)
          this.environments.push(
            this.frames[this.frames.length - 1].environments
          )

          this.cur = callee.pos

          const args: VObject[] = []
          for (let i = 0; i < length.asNumber().value; ++i) {
            args.push(this.popStack())
          }

          this.stack.push(new JSArray(args))
          args.forEach(x => this.stack.push(x))
          break
        }

        case OpCode.Call: {
          const callee = this.popStack()
          const length = this.popStack()

          if (!callee.isObject() || !callee.isFunction()) {
            throw new Error('is not callable')
          }

          if (callee.isNative()) {
            const args: VObject[] = []
            for (let i = 0; i < length.asNumber().value; ++i) {
              args.push(this.popStack())
            }

            this.stack.push(callee.apply(args))
            break
          }

          const stackFrame: StackFrame = {
            ret: this.cur,
            entry: this.stack.length,
            environments: {
              type: EnvironmentType.lexer,
              valueTable: new Map(),
              upValue: callee.upvalue
            },
            thisObject: JSUndefined.instance
          }

          this.frames.push(stackFrame)
          this.environments.push(
            this.frames[this.frames.length - 1].environments
          )

          this.cur = callee.pos

          const args: VObject[] = []
          for (let i = 0; i < length.asNumber().value; ++i) {
            args.push(this.popStack())
          }

          this.stack.push(new JSArray(args))
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

        case OpCode.PropAccess: {
          const idx = this.popStack()
          const obj = this.popStack()
          if (obj.isObject() && (idx.isNumber() || idx.isString())) {
            this.stack.push(obj.get(idx))
          } else {
            throw new Error('not supported index access')
          }
          break
        }

        case OpCode.CreateArray: {
          const len = this.popCode()
          const elements: VObject[] = []
          for (let i = 0; i < len; ++i) {
            elements.push(this.popStack())
          }
          const arr = new Array<VObject>()
          for (let i = 0; i < len; ++i) {
            arr.push(elements.pop()!)
          }
          this.stack.push(new JSArray(arr))
          break
        }

        case OpCode.CreateFunction: {
          const name = this.popStack()
          const pos = this.popStack()
          const upValueCount = this.popStack()
          const upValues: string[] = []
          const upValue: Map<string, VObject> = new Map()

          for (let i = 0; i < upValueCount.asNumber().value; ++i) {
            upValues.push(this.popStack().asString().value)
          }

          const func = new JSFunction(
            name.asString(),
            pos.asNumber().value,
            upValue
          )
          this.define(name.asString().value, func, EnvironmentType.lexer)
          this.stack.push(func)

          upValues.forEach(name => upValue.set(name, this.lookup(name)))
          break
        }

        case OpCode.CreateObject: {
          const len = this.popCode()
          const properties: Map<string | number, VObject> = new Map()
          for (let i = 0; i < len; ++i) {
            const name = this.popStack()
            const initializer = this.popStack()
            if (name.isString() || name.isNumber()) {
              properties.set(name.value, initializer)
            } else {
              throw new Error('invalid object key')
            }
          }
          this.stack.push(new JSObject(properties))
          break
        }

        case OpCode.PropAssignment: {
          const obj = this.popStack()
          const idx = this.popStack()
          const value = this.popStack()
          if (obj.isObject() && (idx.isNumber() || idx.isString())) {
            obj.set(idx, value)
          } else {
            throw new Error('invalid object assignment')
          }
          break
        }

        case OpCode.This: {
          this.stack.push(this.frames[this.frames.length - 1].thisObject)
          break
        }

        case OpCode.Null: {
          this.stack.push(JSNull.instance)
          break
        }

        case OpCode.Undefined: {
          this.stack.push(JSUndefined.instance)
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
