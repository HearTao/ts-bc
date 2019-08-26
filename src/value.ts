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

  public debugValue(): any {
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
}

export class JSValue extends VObject {
  constructor(private ref: JSObject) {
    super()
  }

  public debugValue() {
    return this.ref.debugValue()
  }

  public get type() {
    return ObjectType.Value
  }
}

export class JSNumber extends JSPrimitive {
  constructor(public value: number) {
    super()
  }

  public get type() {
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

  public get type() {
    return ObjectType.String
  }
}

export class JSBoolean extends JSPrimitive {
  constructor(public value: boolean) {
    super()
  }

  public get type() {
    return ObjectType.Boolean
  }

  toBoolean() {
    return this
  }
}

export class JSUndefined extends JSPrimitive {
  value: undefined = undefined

  public get type() {
    return ObjectType.Undefined
  }

  toBoolean() {
    return new JSBoolean(false)
  }

  public static instance = new JSUndefined()
}

export class JSNull extends JSPrimitive {
  value: null = null

  public get type() {
    return ObjectType.Null
  }

  toBoolean() {
    return new JSBoolean(false)
  }

  public static instance = new JSNull()
}

export class JSFunction extends JSObject {
  constructor(
    public name: JSString,
    public pos: number,
    public upvalue: Map<string, VObject>
  ) {
    super()
  }

  public get type() {
    return ObjectType.Function
  }
}

export class JSArray extends JSObject {
  public get type() {
    return ObjectType.Array
  }

  constructor(private items: VObject[]) {
    super()
  }

  public get(idx: number) {
    if (idx < 0 || idx >= this.items.length) {
      throw new Error('index access out of range')
    }
    return this.items[idx]
  }

  toArray() {
    return this
  }

  public debugValue() {
    return this.items
  }
}
