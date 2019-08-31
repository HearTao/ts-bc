import { OpCode, OpValue } from './opcode'
import { assertOPValue, assertDef, assertNever, assertOPCode } from './utils'
import {
  VMDump,
  DoneResult,
  ExecResult,
  Environment,
  EnvironmentType,
  StackFrame,
  JSPropertyDescriptor,
  ObjectMemberType,
  Callable,
  BlockEnvironmentKind,
  IterableBlockEnviroment,
  BlockEnvironment,
  LabeledBlockEnvironment
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
  JSObject,
  JSForInOrOfIterator,
  JSLambda,
  JSLValue,
  LValueType,
  LValueInfo
} from './value'
import { init } from './bom'

export default class VirtualMachine implements Callable {
  private stack: VObject[] = []
  private frames: StackFrame[] = []
  private environments: Environment[] = []

  constructor(
    private codes: (OpCode | OpValue)[] = [],
    private values: VObject[] = [],
    private cur: number = 0,
    valueTable: Map<string, VObject> = new Map()
  ) {
    this.initGlobal(valueTable)
  }

  private initGlobal(valueTable: Map<string, VObject>) {
    this.environments.push({
      type: EnvironmentType.global,
      valueTable
    })

    init(this, valueTable)
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
    while (this.cur < this.codes.length) {
      const op = assertOPCode(this.codes[this.cur++])

      switch (op) {
        case OpCode.Const:
          this.stack.push(this.values[this.popCode()])
          break
        case OpCode.Add:
        case OpCode.Sub:
        case OpCode.Mul:
        case OpCode.Div:
        case OpCode.Pow:
        case OpCode.Mod:

        case OpCode.BitwiseAnd:
        case OpCode.BitwiseOr:
        case OpCode.BitwiseXor:
        case OpCode.LogicalAnd:
        case OpCode.LogicalOr:
        case OpCode.RightArithmeticShift:
        case OpCode.LeftArithmeticShift:
        case OpCode.RightLogicalShift:
        case OpCode.LT:
        case OpCode.GT:
        case OpCode.LTE:
        case OpCode.GTE:
        case OpCode.StrictEQ:
        case OpCode.StrictNEQ:
          this.binaryOp(op)
          break

        case OpCode.PrefixPlus:
        case OpCode.PrefixMinus:
        case OpCode.BitwiseNot:

        case OpCode.LogicalNot:
          this.unaryOp(op)
          break

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

        case OpCode.JumpIfTrue: {
          const cond = this.popStack()
          const pos = this.popCode()
          if (cond.asBoolean().value) {
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
            kind: BlockEnvironmentKind.normal,
            valueTable: new Map()
          })
          break
        }

        case OpCode.EnterLabeledBlockScope: {
          const end = this.popCode()
          const label = this.popStack()
          this.environments.push({
            type: EnvironmentType.block,
            kind: BlockEnvironmentKind.labeled,
            valueTable: new Map(),
            label: label.asString().value,
            end
          })
          break
        }

        case OpCode.EnterIterableBlockScope: {
          const end = this.popCode()
          this.environments.push({
            type: EnvironmentType.block,
            kind: BlockEnvironmentKind.iterable,
            valueTable: new Map(),
            end
          })
          break
        }

        case OpCode.ExitBlockScope: {
          this.environments.pop()
          break
        }

        case OpCode.Break: {
          let env: IterableBlockEnviroment | undefined = undefined

          while (
            this.environments[this.environments.length - 1].type ===
            EnvironmentType.block
          ) {
            const top = this.environments.pop() as BlockEnvironment
            if (top.kind === BlockEnvironmentKind.iterable) {
              env = top as IterableBlockEnviroment
              break
            }
          }

          if (!env) {
            throw new Error('cannot break non-iterable block')
          }

          this.cur = env.end
          break
        }

        case OpCode.BreakLabel: {
          let env: LabeledBlockEnvironment | undefined = undefined

          while (
            this.environments[this.environments.length - 1].type ===
            EnvironmentType.block
          ) {
            const top = this.environments.pop() as BlockEnvironment
            if (top.kind === BlockEnvironmentKind.labeled) {
              env = top as LabeledBlockEnvironment
              break
            }
          }

          if (!env) {
            throw new Error('cannot break non-labeled block')
          }

          this.cur = env.end
          break
        }

        case OpCode.CallMethod: {
          const idx = this.popStack()
          const obj = this.popStack()

          if (obj.isObject() && (idx.isNumber() || idx.isString())) {
            this.getProp(obj, obj, idx)
          } else {
            throw new Error('not supported index access')
          }

          const callee = this.popStack()
          const length = this.popStack()

          if (!callee.isObject() || !callee.isFunction()) {
            throw new Error('is not callable')
          }

          const args: VObject[] = []
          for (let i = 0; i < length.asNumber().value; ++i) {
            args.push(this.popStack())
          }

          this.call(callee, args, obj)
          break
        }

        case OpCode.Call: {
          const callee = this.popStack()
          const length = this.popStack()

          if (!callee.isObject() || !callee.isFunction()) {
            throw new Error('is not callable')
          }

          const args: VObject[] = []
          for (let i = 0; i < length.asNumber().value; ++i) {
            args.push(this.popStack())
          }

          this.call(callee, args, JSUndefined.instance)
          break
        }

        case OpCode.Ret: {
          const ret = this.popStack()
          const frame = this.frames.pop()!
          this.cur = frame.ret
          this.stack = this.stack.slice(0, frame.entry)
          this.stack.push(ret)
          this.environments = this.environments.slice(
            0,
            this.environments.indexOf(frame.environments)
          )
          break
        }

        case OpCode.PropAccess: {
          const idx = this.popStack()
          const obj = this.popStack()
          if (obj.isObject() && (idx.isNumber() || idx.isString())) {
            this.getProp(obj, obj, idx)
          } else {
            throw new Error('not supported index access')
          }
          break
        }

        case OpCode.ForOfStart:
        case OpCode.ForInStart: {
          const obj = this.popStack()
          if (!obj.isObject()) {
            throw new Error('not supported non-object')
          }
          this.stack.push(new JSForInOrOfIterator(obj))
          break
        }

        case OpCode.ForInNext: {
          const iter = this.popStack()
          this.forInNext(iter as JSForInOrOfIterator)
          break
        }

        case OpCode.ForOfNext: {
          const iter = this.popStack()
          this.forOfNext(iter as JSForInOrOfIterator)
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
          const length = this.popStack()
          const pos = this.popStack()
          const upValueCount = this.popStack()
          const upValues: string[] = []
          const upValue: Map<string, VObject> = new Map()

          for (let i = 0; i < upValueCount.asNumber().value; ++i) {
            upValues.push(this.popStack().asString().value)
          }

          const func = new JSFunction(
            name.asString(),
            length.asNumber().value,
            pos.asNumber().value,
            upValue
          )
          this.define(name.asString().value, func, EnvironmentType.lexer)
          this.stack.push(func)

          upValues.forEach(name => upValue.set(name, this.lookup(name)))
          break
        }

        case OpCode.CreateLambda: {
          const length = this.popStack()
          const pos = this.popStack()
          const upValueCount = this.popStack()
          const upValues: string[] = []
          const upValue: Map<string, VObject> = new Map()

          for (let i = 0; i < upValueCount.asNumber().value; ++i) {
            upValues.push(this.popStack().asString().value)
          }

          const func = new JSLambda(
            this.frames[this.frames.length - 1].thisObject,
            length.asNumber().value,
            pos.asNumber().value,
            upValue
          )
          this.stack.push(func)

          upValues.forEach(name => upValue.set(name, this.lookup(name)))
          break
        }

        case OpCode.CreateObject: {
          const obj = new JSObject()
          const len = this.popCode()
          for (let i = 0; i < len; ++i) {
            const type = this.popStack()
            const name = this.popStack()
            const initializer = this.popStack()
            if (type.isNumber() && (name.isString() || name.isNumber())) {
              switch (type.value) {
                case ObjectMemberType.property:
                  obj.set(name, initializer)
                  break
                case ObjectMemberType.getter:
                  if (initializer.isObject() && initializer.isFunction()) {
                    const descriptor =
                      obj.getDescriptor(name) ||
                      new JSPropertyDescriptor(undefined, true, true)
                    descriptor.getter = initializer
                    obj.setDescriptor(name, descriptor)
                  } else {
                    throw new Error('invalid getter')
                  }
                  break
              }
            } else {
              throw new Error('invalid object key')
            }
          }
          this.stack.push(obj)
          break
        }

        case OpCode.This: {
          this.stack.push(this.frames[this.frames.length - 1].thisObject)
          break
        }

        case OpCode.New: {
          const callee = this.popStack()
          const length = this.popStack()

          if (!callee.isObject() || !callee.isFunction()) {
            throw new Error('is not callable')
          }

          const args: VObject[] = []
          for (let i = 0; i < length.asNumber().value; ++i) {
            args.push(this.popStack())
          }

          const protoType = callee.get(new JSString('prototype'))

          const self = new JSObject()
          self.setDescriptor(
            new JSString('__proto__'),
            new JSPropertyDescriptor(protoType, false)
          )
          this.stack.push(self)
          this.call(callee, args, self)
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

        case OpCode.False: {
          this.stack.push(JSBoolean.False)
          break
        }

        case OpCode.True: {
          this.stack.push(JSBoolean.True)
          break
        }

        case OpCode.Zero: {
          this.stack.push(JSNumber.Zero)
          break
        }

        case OpCode.One: {
          this.stack.push(JSNumber.One)
          break
        }

        case OpCode.Drop: {
          this.stack.pop()
          break
        }

        case OpCode.Dup: {
          const value = this.popStack()
          this.stack.push(value, value)
          break
        }

        case OpCode.Over: {
          const a = this.popStack()
          const b = this.popStack()
          this.stack.push(b, a, b)
          break
        }

        case OpCode.Swap: {
          const a = this.popStack()
          const b = this.popStack()
          this.stack.push(a, b)
          break
        }

        case OpCode.LoadLeftValue: {
          const lvalue = this.popStack()
          if (lvalue.isObject()) {
            const name = this.popStack()
            this.stack.push(
              new JSLValue({
                type: LValueType.propertyAccess,
                obj: lvalue,
                name
              })
            )
          } else {
            this.stack.push(
              new JSLValue({
                type: LValueType.identifier,
                name: lvalue
              })
            )
          }
          break
        }

        case OpCode.SetLeftValue: {
          const lvalue = this.popStack() as JSLValue
          const value = this.popStack()
          if (lvalue.info.type === LValueType.identifier) {
            this.setValue(lvalue.info.name.asString().value, value)
          } else {
            if (
              lvalue.info.obj.isObject() &&
              (lvalue.info.name.isNumber() || lvalue.info.name.isString())
            ) {
              lvalue.info.obj.set(lvalue.info.name, value)
            } else {
              throw new Error('invalid lhs assignment')
            }
          }
          break
        }

        default:
          assertNever(op)
          break
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

  unaryOp(op: OpCode) {
    const operand = this.popStack()
    switch (op) {
      case OpCode.PrefixPlus: {
        this.stack.push(new JSNumber(+operand.asNumber().value))
        break
      }
      case OpCode.PrefixMinus: {
        this.stack.push(new JSNumber(-operand.asNumber().value))
        break
      }
      case OpCode.BitwiseNot: {
        this.stack.push(new JSNumber(~operand.asNumber().value))
        break
      }
      case OpCode.LogicalNot: {
        this.stack.push(new JSBoolean(!operand.asBoolean().value))
        break
      }
    }
  }

  binaryOp(op: OpCode) {
    const right = this.popStack()
    const left = this.popStack()

    switch (op) {
      case OpCode.Add: {
        this.stack.push(
          new JSNumber(left.asNumber().value + right.asNumber().value)
        )
        break
      }
      case OpCode.Sub: {
        this.stack.push(
          new JSNumber(left.asNumber().value - right.asNumber().value)
        )
        break
      }
      case OpCode.Mul: {
        this.stack.push(
          new JSNumber(left.asNumber().value * right.asNumber().value)
        )
        break
      }
      case OpCode.Div: {
        this.stack.push(
          new JSNumber(left.asNumber().value / right.asNumber().value)
        )
        break
      }

      case OpCode.LT: {
        this.stack.push(
          new JSBoolean(left.asNumber().value < right.asNumber().value)
        )
        break
      }

      case OpCode.GT: {
        this.stack.push(
          new JSBoolean(left.asNumber().value > right.asNumber().value)
        )
        break
      }

      case OpCode.LTE: {
        this.stack.push(
          new JSBoolean(left.asNumber().value <= right.asNumber().value)
        )
        break
      }

      case OpCode.GTE: {
        this.stack.push(
          new JSBoolean(left.asNumber().value >= right.asNumber().value)
        )
        break
      }

      case OpCode.StrictEQ: {
        if (left.isNumber() && right.isNumber()) {
          this.stack.push(new JSBoolean(left.value === right.value))
        } else {
          this.stack.push(new JSBoolean(left === right))
        }
        break
      }

      case OpCode.StrictNEQ: {
        if (left.isNumber() && right.isNumber()) {
          this.stack.push(new JSBoolean(left.value !== right.value))
        } else {
          this.stack.push(new JSBoolean(left !== right))
        }
        break
      }

      case OpCode.Pow: {
        this.stack.push(
          new JSNumber(left.asNumber().value ** right.asNumber().value)
        )
        break
      }
      case OpCode.Mod: {
        this.stack.push(
          new JSNumber(left.asNumber().value % right.asNumber().value)
        )
        break
      }
      case OpCode.BitwiseAnd: {
        this.stack.push(
          new JSNumber(left.asNumber().value & right.asNumber().value)
        )
        break
      }
      case OpCode.BitwiseOr: {
        this.stack.push(
          new JSNumber(left.asNumber().value | right.asNumber().value)
        )
        break
      }
      case OpCode.BitwiseXor: {
        this.stack.push(
          new JSNumber(left.asNumber().value & right.asNumber().value)
        )
        break
      }
      case OpCode.RightArithmeticShift: {
        this.stack.push(
          new JSNumber(left.asNumber().value >> right.asNumber().value)
        )
        break
      }
      case OpCode.LeftArithmeticShift: {
        this.stack.push(
          new JSNumber(left.asNumber().value << right.asNumber().value)
        )
        break
      }
      case OpCode.RightLogicalShift: {
        this.stack.push(
          new JSNumber(left.asNumber().value >>> right.asNumber().value)
        )
        break
      }
    }
  }

  call(callee: JSFunction, args: VObject[], thisObject: VObject) {
    if (callee.isBridge()) {
      if (callee.isNative()) {
        this.stack.push(callee.apply(thisObject, args.reverse()))
      } else {
        callee.apply(thisObject, args.reverse())
      }
      return
    }
    if (callee.isLambda()) {
      thisObject = callee.thisObject
    }

    const stackFrame: StackFrame = {
      thisObject,
      ret: this.cur,
      entry: this.stack.length,
      environments: {
        type: EnvironmentType.lexer,
        valueTable: new Map(),
        upValue: callee.upvalue
      }
    }

    this.frames.push(stackFrame)
    this.environments.push(this.frames[this.frames.length - 1].environments)

    this.cur = callee.pos
    if (!callee.isLambda()) {
      const argumentsObject = new JSArray(args)
      argumentsObject.set(new JSString('callee'), callee)
      this.define('arguments', argumentsObject, EnvironmentType.lexer)
    }
    args.forEach(x => this.stack.push(x))
    return
  }

  getProp(obj: JSObject, curr: JSObject, key: JSString | JSNumber) {
    if (curr.properties.has(key.value)) {
      const descriptor = curr.properties.get(key.value)!
      this.getValueByDescriptor(obj, descriptor)
      return
    }

    const protoType = curr.get(new JSString('__proto__'))
    if (protoType.isObject()) {
      this.getProp(obj, protoType, key)
      return
    }

    this.stack.push(JSUndefined.instance)
  }

  getValueByDescriptor(obj: JSObject, descriptor: JSPropertyDescriptor) {
    if (descriptor.getter) {
      this.call(descriptor.getter, [], obj)
    } else {
      this.stack.push(descriptor.value!)
    }
  }

  forInNext(iter: JSForInOrOfIterator) {
    const keys = Array.from(iter.target.properties.entries())
      .filter(([_, value]) => !!value.enumerable)
      .map(([key]) => new JSString(key.toString()))
    if (iter.curr < keys.length) {
      this.stack.push(keys[iter.curr++])
      this.stack.push(JSBoolean.False)
    } else {
      this.stack.push(JSBoolean.True)
    }
  }

  forOfNext(iter: JSForInOrOfIterator) {
    const values = Array.from(iter.target.properties.entries())
      .filter(([_, value]) => !!value.enumerable)
      .map(([_, value]) => value)
    if (iter.curr < values.length) {
      this.getValueByDescriptor(iter.target, values[iter.curr++])
      this.stack.push(JSBoolean.False)
    } else {
      this.stack.push(JSBoolean.True)
    }
  }
}
