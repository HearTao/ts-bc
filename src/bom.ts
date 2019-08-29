import {
  VObject,
  JSObject,
  JSNativeFunction,
  JSString,
  JSArray,
  JSFunction
} from './value'
import { JSPropertyDescriptor } from './types'

export function init(valueTable: Map<string, VObject>) {
  initPrototype(valueTable)

  initArrayConstructor(valueTable)
}

export function initPrototype(valueTable: Map<string, VObject>) {
  const metaObjectProto = new JSObject()
  JSObject.protoType = metaObjectProto

  const metaFunctionProto = new JSNativeFunction(
    JSString.empty,
    () => new JSFunction()
  )
  JSFunction.protoType = metaFunctionProto
  metaFunctionProto.setDescriptor(
    new JSString('__proto__'),
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initMetaObjectProto(metaObjectProto)
  initMetaFunctionProto(metaFunctionProto)

  const funcCtor = new JSNativeFunction(JSString.empty, () => new JSObject())
  funcCtor.setDescriptor(
    new JSString('prototype'),
    new JSPropertyDescriptor(metaFunctionProto, false)
  )

  const objectCtor = new JSNativeFunction(JSString.empty, () => new JSObject())
  objectCtor.setDescriptor(
    new JSString('prototype'),
    new JSPropertyDescriptor(metaObjectProto, false)
  )

  initObjectConstructor(objectCtor)
  valueTable.set('Function', funcCtor)
  valueTable.set('Object', objectCtor)
}

function initMetaObjectProto(metaObjectProto: JSObject) {}

function initMetaFunctionProto(metaObjectProto: JSObject) {}

function initObjectConstructor(objectCtor: JSNativeFunction) {
  objectCtor.set(
    new JSString('keys'),
    new JSNativeFunction(new JSString('keys'), (...[obj]: VObject[]) => {
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
  const arrayConstructorProps = new Map<string, VObject>()
  valueTable.set('Array', new JSObject(arrayConstructorProps))
}
