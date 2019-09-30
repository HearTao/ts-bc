import { OpCode, OpValue } from './opcode'
import {
  assertOPValue,
  assertNever,
  assertOPCode,
  assertDef,
  last
} from './utils'
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
  ConstantValue,
  ConstantValueType,
  JSValue,
  JSReference,
  JSHeapValue,
  JSGeneratorFunction,
  JSNativeFunction,
  JSBirdgeFunction,
  GeneratorContext
} from './value'
import { init } from './bom'

export default class VirtualMachine implements Callable {
  private stack: VObject[] = []
  private frames: StackFrame[] = []
  private environments: Environment[] = []
  private heap: JSHeapValue[] = []

  constructor(
    private codes: (OpCode | OpValue)[] = [],
    private constants: ConstantValue[] = [],
    private cur: number = 0,
    init?: (valueTable: Map<string, VObject>) => void
  ) {
    const valueTable = this.initGlobal()
    if (init) {
      init(valueTable)
    }
  }

  private initGlobal() {
    const valueTable: Map<string, VObject> = new Map()
    this.environments.push({
      type: EnvironmentType.global,
      valueTable
    })

    init(this, valueTable)
    return valueTable
  }

  private popStack(deRef: boolean = true) {
    const value = this.stack.pop()
    if (!value) {
      throw new Error('no value')
    }
    if (deRef && value.isReference()) {
      return this.heap[value.idx]
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

  private constantToValue(constant: ConstantValue) {
    switch (constant.type) {
      case ConstantValueType.string:
        return new JSString(constant.value)
      case ConstantValueType.number:
        return new JSNumber(constant.value)
      case ConstantValueType.boolean:
        return new JSBoolean(constant.value)
    }
  }

  dump(): VMDump {
    return {
      stack: this.stack,
      frames: this.frames,
      environments: this.environments,
      codes: this.codes,
      constants: this.constants,
      cur: this.cur
    }
  }

  load(dump: VMDump) {
    this.stack = dump.stack
    this.frames = dump.frames
    this.environments = dump.environments
    this.codes = dump.codes
    this.constants = dump.constants
    this.cur = dump.cur
  }

  step(): DoneResult {
    return this.exec()
  }

  gc() {
    const seen = new Set<VObject>()
    const visitValue = (value: VObject) => {
      if (seen.has(value)) {
        return
      } else {
        seen.add(value)
      }

      if (value.isPrimitive()) return
      if (value.isString()) return
      if (value.isObject()) {
        if (value.isArray()) {
          value.items.forEach(visitValue)
        }
        if (value.isFunction()) {
          visitValue(value.name)
          value.upvalue.forEach(visitValue)
        }
        Array.from(value.properties.values()).forEach(desc => {
          if (desc.value) {
            visitValue(desc.value)
          }
        })
        return
      }

      if (value.isReference()) {
        if (refIdx.has(value.idx)) {
          refIdx.set(value.idx, refIdx.get(value.idx)!.concat([value]))
        } else {
          refIdx.set(value.idx, [value])
        }

        visitValue(this.heap[value.idx])
      }
    }

    const refIdx = new Map<number, JSReference[]>()
    this.environments.forEach(env => env.valueTable.forEach(visitValue))

    const newHeap: JSHeapValue[] = []
    Array.from(refIdx.entries()).forEach(([index, refs]) => {
      const val = this.heap[index]
      const newIdx = newHeap.length
      newHeap.push(val)
      refs.forEach(ref => (ref.idx = newIdx))
    })

    const count = this.heap.length - newHeap.length
    this.heap = newHeap

    return count
  }

  exec(step: true): ExecResult
  exec(step?: false): DoneResult
  exec(step?: boolean): ExecResult {
    while (this.cur < this.codes.length) {
      const op = assertOPCode(this.codes[this.cur++])

      switch (op) {
        case OpCode.Const: {
          const constant = this.constants[this.popCode()]
          this.stack.push(this.constantToValue(constant))
          break
        }

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
          const initializer = this.popStack(false)
          this.define(name.asString().value, initializer, EnvironmentType.lexer)
          break
        }
        case OpCode.DefBlock: {
          const name = this.popStack()
          const initializer = this.popStack(false)
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

        case OpCode.EnterTryBlockScope: {
          const catchPos = this.popCode()
          this.environments.push({
            type: EnvironmentType.block,
            kind: BlockEnvironmentKind.try,
            valueTable: new Map(),
            catchPos
          })
          break
        }

        case OpCode.ExitBlockScope: {
          const top = this.environments.pop()!
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

          if (obj.isValue() && (idx.isNumber() || idx.isString())) {
            this.getProp(obj, obj, idx)
          } else {
            throw new Error('not supported index access')
          }

          let callee = this.popStack()
          const length = this.popStack()

          if (callee.isReference()) {
            callee = this.heap[callee.idx]
          }

          if (!callee.isValue() || !callee.isFunction()) {
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
          let callee = this.popStack()
          const length = this.popStack()

          if (callee.isReference()) {
            callee = this.heap[callee.idx]
          }

          if (!callee.isValue() || !callee.isFunction()) {
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
          if (obj.isValue() && (idx.isNumber() || idx.isString())) {
            this.getProp(obj, obj, idx)
          } else {
            throw new Error('not supported index access')
          }
          break
        }

        case OpCode.ForOfStart:
        case OpCode.ForInStart: {
          const obj = this.popStack()
          if (!obj.isValue()) {
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
          const ref = new JSReference(this.heap.length)
          this.heap.push(new JSArray(arr))
          this.stack.push(ref)
          break
        }

        case OpCode.CreateFunction: {
          const code = this.popStack()
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
            upValue,
            code.asString().value
          )
          const ref = new JSReference(this.heap.length)
          this.heap.push(func)
          this.define(name.asString().value, ref, EnvironmentType.lexer)
          this.stack.push(ref)

          upValues.forEach(name => upValue.set(name, this.lookup(name)))
          break
        }

        case OpCode.CreateLambda: {
          const code = this.popStack()
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
            upValue,
            code.asString().value
          )
          const ref = new JSReference(this.heap.length)
          this.heap.push(func)
          this.stack.push(ref)

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
                      obj.getDescriptor(name.value) ||
                      new JSPropertyDescriptor(undefined, true, true)
                    descriptor.getter = initializer
                    obj.setDescriptor(name.value, descriptor)
                  } else {
                    throw new Error('invalid getter')
                  }
                  break
              }
            } else {
              throw new Error('invalid object key')
            }
          }
          const ref = new JSReference(this.heap.length)
          this.heap.push(obj)
          this.stack.push(ref)
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
            '__proto__',
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
          const value = this.popStack(false)
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

        case OpCode.CreateGenerator: {
          const code = this.popStack()
          const name = this.popStack()
          const length = this.popStack()
          const pos = this.popStack()
          const upValueCount = this.popStack()
          const upValues: string[] = []
          const upValue: Map<string, VObject> = new Map()

          for (let i = 0; i < upValueCount.asNumber().value; ++i) {
            upValues.push(this.popStack().asString().value)
          }

          const func = new JSGeneratorFunction(
            name.asString(),
            length.asNumber().value,
            pos.asNumber().value,
            upValue,
            code.asString().value
          )
          const ref = new JSReference(this.heap.length)
          this.heap.push(func)
          this.define(name.asString().value, ref, EnvironmentType.lexer)
          this.stack.push(ref)

          upValues.forEach(name => upValue.set(name, this.lookup(name)))
          break
        }
        case OpCode.CreateGeneratorContext: {
          const pos = this.popCode()

          const frame = this.frames[this.frames.length - 1]
          const context = new GeneratorContext(
            pos,
            frame,
            this.environments.slice(
              this.environments.indexOf(frame.environments)
            )
          )
          frame.generatorContext = context

          const iter = new JSObject(
            new Map([
              [
                'next',
                new JSBirdgeFunction(new JSString('next'), obj => {
                  if (context.done) {
                    this.stack.push(
                      this.generatorResult(JSUndefined.instance, true)
                    )
                    return
                  }

                  context.ret = this.cur
                  context.frame.entry = this.stack.length

                  this.frames.push(context.frame)
                  this.environments.push(...context.envs)

                  this.stack.push(...context.stack)
                  this.stack.push(obj || JSUndefined.instance)
                  this.cur = context.pos
                  return
                })
              ],
              [
                'return',
                new JSBirdgeFunction(new JSString('return'), obj => {
                  context.done = true
                  this.stack.push(
                    this.generatorResult(obj || JSUndefined.instance, true)
                  )
                  return
                })
              ]
            ])
          )
          this.stack.push(iter)
          break
        }

        case OpCode.Yield: {
          const value = this.popStack()

          const frame = this.frames.pop()!
          const context = assertDef(frame.generatorContext)
          context.stack = this.stack.slice(frame.entry)
          this.stack = this.stack.slice(0, frame.entry)
          this.environments = this.environments.slice(
            0,
            this.environments.indexOf(frame.environments)
          )

          context.pos = this.cur
          this.stack.push(this.generatorResult(value, context.done))
          this.cur = context.ret
          break
        }

        case OpCode.YieldStar: {
          break
        }

        case OpCode.GeneratorReturn: {
          const value = this.popStack()

          const frame = this.frames.pop()!
          const context = assertDef(frame.generatorContext)
          this.stack = this.stack.slice(0, frame.entry)
          this.environments = this.environments.slice(
            0,
            this.environments.indexOf(frame.environments)
          )

          context.pos = this.cur
          context.done = true
          this.stack.push(this.generatorResult(value, context.done))
          this.cur = context.ret
          break
        }

        case OpCode.Throw: {
          const value = this.popStack()
          while (true) {
            const env = last(this.environments)
            if (env.type === EnvironmentType.global) {
              throw new Error('Uncaught error: ' + value)
            } else if (env.type === EnvironmentType.lexer) {
              this.frames.pop()
              this.environments.pop()
            } else {
              this.environments.pop()
              if (env.kind === BlockEnvironmentKind.try) {
                this.stack.push(value)
                this.cur = env.catchPos
                break
              }
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
        const value =
          right.isString() || left.isString()
            ? new JSString(left.asString().value + right.asString().value)
            : new JSNumber(left.asNumber().value + right.asNumber().value)
        this.stack.push(value)
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
      case OpCode.LogicalAnd: {
        const firstAsBoolean = left.asBoolean()
        this.stack.push(firstAsBoolean.value ? right : left)
        break
      }
      case OpCode.LogicalOr: {
        const firstAsBoolean = left.asBoolean()
        this.stack.push(firstAsBoolean.value ? left : right)
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
      },
      generatorContext: undefined
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

  getPropIndexAccess(obj: JSArray | JSString, key: JSNumber): boolean {
    if (obj.isArray()) {
      if (0 <= key.value && key.value < obj.items.length) {
        this.stack.push(obj.items[key.value])
        return true
      }
    }
    if (obj.isString()) {
      if (0 <= key.value && key.value < obj.value.length) {
        this.stack.push(new JSString(obj.value[key.value]))
        return true
      }
    }
    return false
  }

  getProp(obj: JSValue, curr: JSValue, key: JSString | JSNumber) {
    if (key.isNumber() && (obj.isString() || obj.isArray())) {
      if (this.getPropIndexAccess(obj, key)) {
        return
      }
    }

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

  getValueByDescriptor(obj: JSValue, descriptor: JSPropertyDescriptor) {
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
    if (iter.target.isString()) {
      const values = iter.target.value.split('')
      if (iter.curr < values.length) {
        this.stack.push(new JSString(values[iter.curr++]))
        this.stack.push(JSBoolean.False)
      } else {
        this.stack.push(JSBoolean.True)
      }
      return
    }
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

  generatorResult(value: VObject, done: boolean) {
    return new JSObject(
      new Map([['value', value], ['done', new JSBoolean(done)]])
    )
  }
}
