import {
  VObject,
  JSObject,
  JSNativeFunction,
  JSString,
  JSArray,
  JSFunction,
  JSNumber,
  JSBirdgeFunction,
  JSValue
} from './value'
import { JSPropertyDescriptor, Callable } from './types'

export function init(vm: Callable, valueTable: Map<string, VObject>) {
  initPrototype(vm, valueTable)

  initArrayConstructor(valueTable)
  initStringConstructor(valueTable)
}

export function initPrototype(vm: Callable, valueTable: Map<string, VObject>) {
  const metaObjectProto = new JSObject()
  JSObject.protoType = metaObjectProto

  const metaFunctionProto = new JSNativeFunction(
    JSString.Empty,
    () => new JSFunction()
  )
  JSFunction.protoType = metaFunctionProto
  metaFunctionProto.setDescriptor(
    '__proto__',
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initMetaObjectProto(metaObjectProto)
  initMetaFunctionProto(vm, metaFunctionProto)

  const funcCtor = new JSNativeFunction(JSString.Empty, () => new JSObject())
  funcCtor.setDescriptor(
    'prototype',
    new JSPropertyDescriptor(metaFunctionProto, false)
  )

  const objectCtor = new JSNativeFunction(JSString.Empty, () => new JSObject())
  objectCtor.setDescriptor(
    'prototype',
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initObjectConstructor(objectCtor)
  valueTable.set('Function', funcCtor)
  valueTable.set('Object', objectCtor)
}

function initMetaObjectProto(metaObjectProto: JSObject) {}

function initMetaFunctionProto(vm: Callable, metaFunctionProto: JSValue) {
  metaFunctionProto.set(
    new JSString('call'),
    new JSBirdgeFunction(new JSString('call'), function(self, ...args) {
      if (this.isValue() && this.isFunction()) {
        vm.call(this, args, self)
        return
      }
      throw new Error('is not callable')
    })
  )
  metaFunctionProto.set(
    new JSString('apply'),
    new JSBirdgeFunction(new JSString('apply'), function(self, args) {
      if (
        this.isValue() &&
        this.isFunction() &&
        args.isValue() &&
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
    new JSNativeFunction(new JSString('bind'), function(self, ...args) {
      if (this.isValue() && this.isFunction()) {
        const callee = this
        return new JSBirdgeFunction(JSString.Empty, function() {
          vm.call(callee, args, self)
        })
      }
      throw new Error('is not callable')
    })
  )
  metaFunctionProto.set(
    new JSString('toString'),
    new JSNativeFunction(new JSString('toString'), function() {
      if (this.isValue() && this.isFunction()) {
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

function initObjectConstructor(objectCtor: JSNativeFunction) {
  objectCtor.set(
    new JSString('keys'),
    new JSNativeFunction(new JSString('keys'), obj => {
      if (obj.isValue()) {
        return new JSArray(
          Array.from(obj.properties.entries())
            .filter(([_, value]) => !!value.enumerable)
            .map(([key]) => new JSString(key.toString()))
        )
      }
      return new JSArray([])
    })
  )
}

function initArrayConstructor(valueTable: Map<string, VObject>) {
  const araryProto = new JSObject()
  JSArray.protoType = araryProto

  const arrayCtor = new JSNativeFunction(
    new JSString('Array'),
    () => new JSArray([])
  )

  araryProto.set(
    new JSString('join'),
    new JSNativeFunction(new JSString('join'), function(str) {
      if (this.isValue() && this.isArray() && str.isString()) {
        return new JSString(
          this.items.map(x => x.asString().value).join(str.value)
        )
      }
      throw new Error('type error')
    })
  )

  araryProto.setDescriptor(
    'length',
    new JSPropertyDescriptor(
      undefined,
      false,
      true,
      new JSNativeFunction(new JSString(''), function() {
        if (this.isValue() && this.isArray()) {
          return new JSNumber(this.items.length)
        }
        throw new Error('type error')
      })
    )
  )

  valueTable.set('Array', arrayCtor)
}

function initStringConstructor(valueTable: Map<string, VObject>) {
  const stringProto = new JSObject()
  JSString.protoType = stringProto

  const stringCtor = new JSNativeFunction(
    new JSString('String'),
    () => new JSString('')
  )

  stringProto.set(
    new JSString('split'),
    new JSNativeFunction(new JSString('split'), function(str) {
      if (this.isString() && str.isString()) {
        return new JSArray(
          this.value.split(str.value).map(x => new JSString(x))
        )
      }
      throw new Error('type error')
    })
  )

  stringProto.setDescriptor(
    'length',
    new JSPropertyDescriptor(
      undefined,
      false,
      true,
      new JSNativeFunction(new JSString(''), function() {
        if (this.isString()) {
          return new JSNumber(this.value.length)
        }
        throw new Error('type error')
      })
    )
  )

  valueTable.set('Array', stringCtor)
}
