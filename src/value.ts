import { assertDef } from './utils'
import { JSPropertyDescriptor } from './types'

export enum ConstantValueType {
  string,
  number,
  boolean
}

export interface ConstantValueBase {
  type: ConstantValueType
}

export interface ConstantValueString extends ConstantValueBase {
  type: ConstantValueType.string
  value: string
}

export interface ConstantValueNumber extends ConstantValueBase {
  type: ConstantValueType.number
  value: number
}

export interface COnstantValueBoolean extends ConstantValueBase {
  type: ConstantValueType.boolean
  value: boolean
}

export type ConstantValue =
  | ConstantValueString
  | ConstantValueNumber
  | COnstantValueBoolean

export abstract class VObject {
  public abstract debugValue(): any

  isNumber(): this is JSNumber {
    return false
  }

  isString(): this is JSString {
    return false
  }

  isBoolean(): this is JSBoolean {
    return false
  }

  isNull(): this is JSNull {
    return false
  }

  isUndefined(): this is JSUndefined {
    return false
  }

  isPrimitive(): this is JSPrimitive {
    return this.isNumber() || this.isBoolean() || this.isString()
  }

  isValue(): this is JSValue {
    return false
  }

  isObject(): this is JSObject {
    return false
  }

  asNumber() {
    if (this.isNumber()) {
      return this
    }
    throw new Error('invalid cast')
  }

  asString() {
    if (this.isString()) {
      return this
    }
    throw new Error('invalid cast')
  }

  asBoolean(): JSBoolean {
    throw new Error('invalid cast')
  }
}

export class JSValue extends VObject {
  private rc: number = 0
  public properties: Map<string | number, JSPropertyDescriptor> = new Map()

  constructor(properties: Map<string | number, VObject> = new Map()) {
    super()

    properties.forEach((value, key) => {
      this.properties.set(key, new JSPropertyDescriptor(value))
    })
  }

  static protoType: JSObject | undefined

  debugValue(): any {
    return this
  }

  isValue(): this is JSValue {
    return true
  }

  isObject(): this is JSObject {
    return false
  }

  isArray(): this is JSArray {
    return false
  }

  isFunction(): this is JSFunction {
    return false
  }

  get(key: JSString | JSNumber): VObject | JSUndefined {
    if (this.properties.has(key.value)) {
      const descriptor = this.properties.get(key.value)!
      return descriptor.value!
    }
    return JSUndefined.instance
  }

  set(key: JSString | JSNumber, value: VObject) {
    if (this.properties.has(key.value)) {
      const descriptor = this.properties.get(key.value)!
      descriptor.value = value
      this.setDescriptor(key, descriptor)
    } else {
      this.setDescriptor(key, new JSPropertyDescriptor(value))
    }
  }

  getDescriptor(key: JSString | JSNumber): JSPropertyDescriptor | undefined {
    return this.properties.get(key.value)
  }

  setDescriptor(key: JSString | JSNumber, descriptor: JSPropertyDescriptor) {
    this.properties.set(key.value, descriptor)
  }
}

export class JSObject extends JSValue {
  constructor(properties: Map<string | number, VObject> = new Map()) {
    super(properties)

    this.setDescriptor(
      new JSString('__proto__'),
      new JSPropertyDescriptor(JSObject.protoType || JSNull.instance, false)
    )
  }

  isObject(): this is JSObject {
    return true
  }

  asArray(): JSArray {
    throw new Error('invalid cast')
  }
}

export abstract class JSPrimitive extends JSValue {
  protected abstract get value(): any

  public debugValue() {
    return this.value
  }
}

export class JSUndefined extends JSPrimitive {
  value: undefined = undefined

  isUndefined(): this is JSUndefined {
    return true
  }

  asBoolean() {
    return new JSBoolean(false)
  }

  static instance = new JSUndefined()
}

export class JSNull extends JSPrimitive {
  value: null = null

  isNull(): this is JSNull {
    return true
  }

  asBoolean() {
    return new JSBoolean(false)
  }

  static instance = new JSNull()
}

export class JSNumber extends JSPrimitive {
  constructor(public value: number) {
    super()
  }

  static Zero = new JSNumber(0)
  static One = new JSNumber(1)

  isNumber(): this is JSNumber {
    return true
  }

  asBoolean() {
    return new JSBoolean(!!this.value)
  }
}

export class JSString extends JSPrimitive {
  constructor(public value: string) {
    super()
  }

  static protoType: JSObject

  static Empty = new JSString('')

  isString(): this is JSString {
    return true
  }
}

export class JSBoolean extends JSPrimitive {
  constructor(public value: boolean) {
    super()
  }

  static False = new JSBoolean(false)
  static True = new JSBoolean(true)

  asBoolean() {
    return this
  }

  isBoolean(): this is JSBoolean {
    return true
  }
}

export class JSFunction extends JSObject {
  constructor(
    public name: JSString = JSString.Empty,
    public length: number = -1,
    public pos: number = -1,
    public upvalue: Map<string, VObject> = new Map()
  ) {
    super(new Map())

    this.setDescriptor(
      new JSString('__proto__'),
      new JSPropertyDescriptor(assertDef(JSFunction.protoType), false)
    )
    this.setDescriptor(
      new JSString('prototype'),
      new JSPropertyDescriptor(new JSObject(), false)
    )
  }

  static protoType: JSObject

  isFunction(): this is JSFunction {
    return true
  }

  isBridge(): this is JSBirdgeFunction {
    return false
  }

  isLambda(): this is JSLambda {
    return false
  }
}

export class JSLambda extends JSFunction {
  constructor(
    public thisObject: VObject,
    public length: number,
    public pos: number = -1,
    public upvalue: Map<string, VObject> = new Map()
  ) {
    super(JSString.Empty, length, pos, upvalue)
  }

  isLambda(): this is JSLambda {
    return true
  }
}

export class JSBirdgeFunction extends JSFunction {
  constructor(
    public name: JSString,
    public func: (this: VObject, ...args: VObject[]) => void
  ) {
    super(name)
  }

  isBridge(): this is JSBirdgeFunction {
    return true
  }

  isNative(): this is JSNativeFunction {
    return false
  }

  apply(self: VObject, args: VObject[]) {
    this.func.apply(self, args)
  }
}

export class JSNativeFunction extends JSBirdgeFunction {
  constructor(
    public name: JSString,
    public func: (this: VObject, ...args: VObject[]) => VObject
  ) {
    super(name, func)
  }

  isNative(): this is JSNativeFunction {
    return true
  }

  apply(self: VObject, args: VObject[]) {
    return this.func.apply(self, args)
  }
}

export class JSArray extends JSObject {
  constructor(public items: VObject[]) {
    super(new Map(items.map((item, i) => [i, item])))

    this.setDescriptor(
      new JSString('__proto__'),
      new JSPropertyDescriptor(assertDef(JSArray.protoType), false)
    )
  }

  static protoType: JSObject

  asArray() {
    return this
  }

  isArray(): this is JSArray {
    return true
  }

  debugValue() {
    return this.items.map(x => x.debugValue())
  }
}

export class JSForInOrOfIterator extends VObject {
  curr: number = 0

  constructor(public target: JSValue) {
    super()
  }

  debugValue(): any {
    return this
  }
}

export enum LValueType {
  identifier,
  propertyAccess
}

export interface LValueInfoIdentifier {
  type: LValueType.identifier
  name: VObject
}

export interface LValueInfoPropertyAccess {
  type: LValueType.propertyAccess
  obj: JSObject
  name: VObject
}

export type LValueInfo = LValueInfoIdentifier | LValueInfoPropertyAccess

export class JSLValue extends VObject {
  constructor(public info: LValueInfo) {
    super()
  }

  debugValue(): any {
    return this
  }
}
