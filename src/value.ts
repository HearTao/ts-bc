import { assertDef } from "./utils";
import { JSPropertyDescriptor } from "./types";

export enum ObjectType {
  Number,
  String,
  Boolean,
  Object,
  Function,
  Array,
  Undefined,
  Null
}

export abstract class VObject {
  protected abstract get type(): ObjectType
  public abstract debugValue(): any

  isNumber(): this is JSNumber {
    return this.type === ObjectType.Number
  }

  isString(): this is JSString {
    return this.type === ObjectType.String
  }

  isBoolean(): this is JSBoolean {
    return this.type === ObjectType.Boolean
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

export abstract class JSPrimitive extends VObject {
  protected abstract get value(): any

  public debugValue() {
    return this.value
  }
}

export class JSUndefined extends JSPrimitive {
  value: undefined = undefined

  get type() {
    return ObjectType.Undefined
  }

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

  get type() {
    return ObjectType.Null
  }

  isNull(): this is JSNull {
    return true
  }

  asBoolean() {
    return new JSBoolean(false)
  }

  static instance = new JSNull()
}

export class JSObject extends VObject {
  private rc: number = 0
  public properties: Map<string | number, JSPropertyDescriptor> = new Map()

  constructor(
    properties: Map<string | number, VObject> = new Map()
  ) {
    super()

    properties.forEach((value, key) => {
      this.properties.set(key, new JSPropertyDescriptor(value))
    })

    this.setDescriptor(new JSString('__proto__'), new JSPropertyDescriptor(JSObject.protoType || JSNull.instance, false))
  }

  static protoType: JSObject | undefined

  get type() {
    return ObjectType.Object
  }

  debugValue(): any {
    return this
  }

  isObject(): this is JSObject {
    return true
  }

  isArray(): this is JSArray {
    return this.type === ObjectType.Array
  }

  isFunction(): this is JSFunction {
    return this.type === ObjectType.Function
  }

  asArray(): JSArray {
    throw new Error('invalid cast')
  }

  get(key: JSString | JSNumber): VObject | JSUndefined {
    if (this.properties.has(key.value)) {
      const descriptor = this.properties.get(key.value)!
      return descriptor.value!
    }

    const protoType = this.getOwn(new JSString('__proto__'))
    if (protoType.isObject()) {
      return protoType.get(key)
    }
    return JSUndefined.instance
  }

  getOwn(key: JSString | JSNumber): VObject | JSUndefined {
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

  setDescriptor(key: JSString | JSNumber, descriptor: JSPropertyDescriptor) {
    this.properties.set(key.value, descriptor)
  }
}

export class JSNumber extends JSPrimitive {
  constructor(public value: number) {
    super()
  }

  get type() {
    return ObjectType.Number
  }

  asBoolean() {
    return new JSBoolean(!!this.value)
  }
}

export class JSString extends JSPrimitive {
  constructor(public value: string) {
    super()
  }

  static empty = new JSString('')

  get type() {
    return ObjectType.String
  }
}

export class JSBoolean extends JSPrimitive {
  constructor(public value: boolean) {
    super()
  }

  get type() {
    return ObjectType.Boolean
  }

  asBoolean() {
    return this
  }
}

export class JSFunction extends JSObject {
  constructor(
    public name: JSString = JSString.empty,
    public pos: number = -1,
    public upvalue: Map<string, VObject> = new Map()
  ) {
    super(new Map())
    
    this.setDescriptor(new JSString('__proto__'), new JSPropertyDescriptor(assertDef(JSFunction.protoType), false))
    this.setDescriptor(new JSString('prototype'), new JSPropertyDescriptor(new JSObject(), false))
  }

  static protoType: JSObject

  isNative(): this is JSNativeFunction {
    return false
  }

  get type() {
    return ObjectType.Function
  }
}

export class JSNativeFunction extends JSFunction {
  constructor(
    public name: JSString,
    public func: (...args: VObject[]) => VObject
  ) {
    super(name)
  }

  isNative(): this is JSNativeFunction {
    return true
  }

  apply(args: VObject[]) {
    return this.func.apply(null, args)
  }
}

export class JSArray extends JSObject {
  get type() {
    return ObjectType.Array
  }

  constructor(private items: VObject[]) {
    super()
  }

  get(idx: JSNumber) {
    if (idx.value < 0 || idx.value >= this.items.length) {
      return JSUndefined.instance
    }
    return this.items[idx.value]
  }

  asArray() {
    return this
  }

  debugValue() {
    return this.items.map(x => x.debugValue())
  }
}
