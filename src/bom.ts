import {
  VObject,
  JSObject,
  JSNativeFunction,
  JSString,
  JSArray,
  JSFunction,
  JSNumber,
  JSUndefined,
  JSBirdgeFunction
} from './value'
import { JSPropertyDescriptor, Callable } from './types'

export function init(vm: Callable, valueTable: Map<string, VObject>) {
  initPrototype(vm, valueTable)

  initArrayConstructor(valueTable)
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
    new JSString('__proto__'),
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initMetaObjectProto(metaObjectProto)
  initMetaFunctionProto(vm, metaFunctionProto)

  const funcCtor = new JSNativeFunction(JSString.Empty, () => new JSObject())
  funcCtor.setDescriptor(
    new JSString('prototype'),
    new JSPropertyDescriptor(metaFunctionProto, false)
  )

  const objectCtor = new JSNativeFunction(JSString.Empty, () => new JSObject())
  objectCtor.setDescriptor(
    new JSString('prototype'),
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initObjectConstructor(objectCtor)
  valueTable.set('Function', funcCtor)
  valueTable.set('Object', objectCtor)
}

function initMetaObjectProto(metaObjectProto: JSObject) {}

function initMetaFunctionProto(vm: Callable, metaFunctionProto: JSObject) {
  metaFunctionProto.set(
    new JSString('call'),
    new JSBirdgeFunction(new JSString('call'), function(self, ...args) {
      if (this.isObject() && this.isFunction()) {
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
    new JSNativeFunction(new JSString('bind'), function(self, ...args) {
      if (this.isObject() && this.isFunction()) {
        const callee = this
        return new JSBirdgeFunction(JSString.Empty, function() {
          vm.call(callee, args, self)
        })
      }
      throw new Error('is not callable')
    })
  )
}

function initObjectConstructor(objectCtor: JSNativeFunction) {
  objectCtor.set(
    new JSString('keys'),
    new JSNativeFunction(new JSString('keys'), obj => {
      if (obj.isObject()) {
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
  const arrayCtor = new JSNativeFunction(
    new JSString('Array'),
    () => new JSArray([])
  )

  const araryProto = new JSObject()
  JSArray.protoType = araryProto

  araryProto.setDescriptor(
    new JSString('length'),
    new JSPropertyDescriptor(
      undefined,
      false,
      true,
      new JSNativeFunction(new JSString(''), function() {
        if (this.isObject() && this.isArray()) {
          return new JSNumber(this.items.length)
        }
        return new JSNumber(0)
      })
    )
  )

  valueTable.set('Array', arrayCtor)
}
