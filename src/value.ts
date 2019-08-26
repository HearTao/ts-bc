export enum ObjectType {
  Number,
  String,
  Boolean,
  Object,
  Value,
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

  isValue(): this is JSValue {
    return false
  }

  isObject(): this is JSObject {
    return false
  }

  toNumber() {
    if (this.isNumber()) {
      return this
    }
    throw new Error('invalid cast')
  }

  toString() {
    if (this.isString()) {
      return this
    }
    throw new Error('invalid cast')
  }

  toBoolean(): JSBoolean {
    throw new Error('invalid cast')
  }
}

export abstract class JSPrimitive extends VObject {
  protected abstract get value(): any

  public debugValue() {
    return this.value
  }
}

export abstract class JSObject extends VObject {
  private rc: number = 0

  constructor (
    private properties: Map<string | number, VObject> = new Map(),
    private prototype: JSObject | JSNull = JSNull.instance
  ) {
    super()
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

  toArray(): JSArray {
    throw new Error('invalid cast')
  }

  get (key: JSString | JSNumber): VObject | JSUndefined {
    if (this.properties.has(key.value)) {
      return this.properties.get(key.value)!
    }
    if (!this.prototype.isNull()) {
      return this.prototype.get(key)
    }
    return JSUndefined.instance
  }
}

export class JSValue extends VObject {
  constructor(private ref: JSObject) {
    super()
  }

  debugValue() {
    return this.ref.debugValue()
  }

  get type() {
    return ObjectType.Value
  }
}

export class JSNumber extends JSPrimitive {
  constructor(public value: number) {
    super()
  }

  get type() {
    return ObjectType.Number
  }

  toBoolean() {
    return new JSBoolean(!!this.value)
  }
}

export class JSString extends JSPrimitive {
  constructor(public value: string) {
    super()
  }

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

  toBoolean() {
    return this
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

  toBoolean() {
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

  toBoolean() {
    return new JSBoolean(false)
  }

  static instance = new JSNull()
}

export class JSFunction extends JSObject {
  constructor(
    public name: JSString,
    public pos: number,
    public upvalue: Map<string, VObject>
  ) {
    super()
  }

  get type() {
    return ObjectType.Function
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
      throw new Error('index access out of range')
    }
    return this.items[idx.value]
  }

  toArray() {
    return this
  }

  debugValue() {
    return this.items
  }
}
