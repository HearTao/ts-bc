import {
  VObject,
  JSObject,
  JSNativeFunction,
  JSString,
  JSArray,
  JSFunction
} from './value'
import { JSUndefined } from './value'

export function init(valueTable: Map<string, VObject>) {
  initPrototype(valueTable)

  initArrayConstructor(valueTable)
}

export function initPrototype(valueTable: Map<string, VObject>) {
  const metaObjectProto = new JSObject()
  initMetaObjectProto(metaObjectProto)

  const metaFunctionProto = new JSNativeFunction(
    JSString.empty,
    () => new JSFunction()
  )
  metaFunctionProto.set(new JSString('__proto__'), metaObjectProto)
  initMetaFunctionProto(metaFunctionProto)

  const funcCtor = new JSNativeFunction(JSString.empty, () => new JSObject())
  funcCtor.set(new JSString('__proto__'), metaFunctionProto)
  funcCtor.set(new JSString('prototype'), metaFunctionProto)

  const objectCtor = new JSNativeFunction(JSString.empty, () => new JSObject())
  objectCtor.set(new JSString('prototype'), metaObjectProto)
  objectCtor.set(new JSString('__proto__'), metaFunctionProto)

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
          Array.from(obj.properties.keys()).map(x => new JSString(x.toString()))
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
