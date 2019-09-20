import {
  VObject,
  JSObject,
  JSNativeFunction,
  JSString,
  JSArray,
  JSFunction,
  JSNumber,
  JSBridgeFunction,
  JSUndefined
} from './value'
import { JSPropertyDescriptor, Callable } from './types'

export function init(vm: Callable, valueTable: Map<string, VObject>): void {
  initPrototype(vm, valueTable)

  initArrayConstructor(valueTable)
  initStringConstructor(valueTable)

  initGC(vm, valueTable)
  initPrint(vm, valueTable)
}

export function initGC(vm: Callable, valueTable: Map<string, VObject>): void {
  valueTable.set(
    'gc',
    new JSNativeFunction(
      new JSString('gc'),
      (): JSNumber => {
        return new JSNumber(vm.gc())
      }
    )
  )
}

export function initPrint(
  vm: Callable,
  valueTable: Map<string, VObject>
): void {
  valueTable.set(
    'print',
    new JSNativeFunction(
      new JSString('print'),
      (...args): JSUndefined => {
        console.log.call(null, args.map(x => x.debugValue()))
        return JSUndefined.instance
      }
    )
  )
}

export function initPrototype(
  vm: Callable,
  valueTable: Map<string, VObject>
): void {
  const metaObjectProto = new JSObject()
  JSObject.protoType = metaObjectProto

  const metaFunctionProto = new JSNativeFunction(
    JSString.Empty,
    (): JSFunction => new JSFunction()
  )
  JSFunction.protoType = metaFunctionProto
  metaFunctionProto.setDescriptor(
    '__proto__',
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initMetaObjectProto(metaObjectProto)
  initMetaFunctionProto(vm, metaFunctionProto)

  const funcCtor = new JSNativeFunction(
    JSString.Empty,
    (): JSObject => new JSObject()
  )
  funcCtor.setDescriptor(
    'prototype',
    new JSPropertyDescriptor(metaFunctionProto, false)
  )

  const objectCtor = new JSNativeFunction(
    JSString.Empty,
    (): JSObject => new JSObject()
  )
  objectCtor.setDescriptor(
    'prototype',
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initObjectConstructor(objectCtor)
  valueTable.set('Function', funcCtor)
  valueTable.set('Object', objectCtor)
}

function initMetaObjectProto(_metaObjectProto: JSObject): void {
  /* do nothing */
}

function initMetaFunctionProto(
  vm: Callable,
  metaFunctionProto: JSObject
): void {
  metaFunctionProto.set(
    new JSString('call'),
    new JSBridgeFunction(new JSString('call'), function(self, ...args): void {
      if (this.isObject() && this.isFunction()) {
        vm.call(this, args, self)
        return
      }
      throw new Error('is not callable')
    })
  )
  metaFunctionProto.set(
    new JSString('apply'),
    new JSBridgeFunction(new JSString('apply'), function(self, args): void {
      if (
        this.isObject() &&
        this.isFunction() &&
        args.isObject() &&
        args.isArray()
      ) {
        vm.call(this, args.items, self)
        return
      }
      throw new Error('is not callable')
    })
  )
  metaFunctionProto.set(
    new JSString('bind'),
    new JSNativeFunction(new JSString('bind'), function(
      self,
      ...args
    ): JSBridgeFunction {
      if (this.isObject() && this.isFunction()) {
        const callee = this
        return new JSBridgeFunction(JSString.Empty, function(): void {
          vm.call(callee, args, self)
        })
      }
      throw new Error('is not callable')
    })
  )
  metaFunctionProto.set(
    new JSString('toString'),
    new JSNativeFunction(new JSString('toString'), function(): JSString {
      if (this.isObject() && this.isFunction()) {
        if (!this.isBridge() || !this.isNative()) {
          return new JSString(this.text)
        } else {
          return new JSString(
            `function ${this.name.asString().value}() { [native code] }`
          )
        }
      }
      throw new Error('is not callable')
    })
  )
}

function initObjectConstructor(objectCtor: JSNativeFunction): void {
  objectCtor.set(
    new JSString('keys'),
    new JSNativeFunction(
      new JSString('keys'),
      (obj): JSArray => {
        if (obj.isObject()) {
          return new JSArray(
            Array.from(obj.properties.entries())
              .filter(([_, value]) => !!value.enumerable)
              .map(([key]) => new JSString(key.toString()))
          )
        }
        return new JSArray([])
      }
    )
  )
}

function initArrayConstructor(valueTable: Map<string, VObject>): void {
  const araryProto = new JSObject()
  JSArray.protoType = araryProto

  const arrayCtor = new JSNativeFunction(
    new JSString('Array'),
    (): JSArray => new JSArray([])
  )

  araryProto.set(
    new JSString('join'),
    new JSNativeFunction(new JSString('join'), function(str): JSString {
      if (this.isObject() && this.isArray() && str.isString()) {
        return new JSString(
          this.items.map(x => x.asString().value).join(str.value)
        )
      }
      return new JSString('')
    })
  )

  araryProto.setDescriptor(
    'length',
    new JSPropertyDescriptor(
      undefined,
      false,
      true,
      new JSNativeFunction(new JSString(''), function(): JSNumber {
        if (this.isObject() && this.isArray()) {
          return new JSNumber(this.items.length)
        }
        return new JSNumber(0)
      })
    )
  )

  valueTable.set('Array', arrayCtor)
}

function initStringConstructor(valueTable: Map<string, VObject>): void {
  const stringProto = new JSObject()
  JSString.protoType = stringProto

  const stringCtor = new JSNativeFunction(
    new JSString('String'),
    (): JSString => new JSString('')
  )

  stringProto.set(
    new JSString('split'),
    new JSNativeFunction(new JSString('split'), function(str): JSArray {
      if (this.isString() && str.isString()) {
        return new JSArray(
          this.value.split(str.value).map(x => new JSString(x))
        )
      }
      return new JSArray([])
    })
  )

  stringProto.setDescriptor(
    'length',
    new JSPropertyDescriptor(
      undefined,
      false,
      true,
      new JSNativeFunction(new JSString(''), function(): JSNumber {
        if (this.isString()) {
          return new JSNumber(this.value.length)
        }
        return new JSNumber(0)
      })
    )
  )

  valueTable.set('Array', stringCtor)
}
