import { VObject, JSObject, JSNativeFunction, JSString, JSArray } from "./value";

export function initPrototype (valueTable: Map<string, VObject>) {
    initObjectPrototype(valueTable)

    initArrayPrototype(valueTable)
}

function initObjectPrototype (valueTable: Map<string, VObject>) {
    const objectPrototypeProps = new Map<string, VObject>()

    objectPrototypeProps.set('keys', new JSNativeFunction(
        new JSString('keys'),
        (...args: VObject[]) => {
            const [obj] = args
            
            if (obj.isObject()) {
                return new JSArray(Array.from(obj.properties.keys()).map(x => new JSString(x.toString())))
            }
            return new JSArray([])
        }
    ))

    valueTable.set('Object', new JSObject(objectPrototypeProps))
}

function initArrayPrototype (valueTable: Map<string, VObject>) {
    const arrayPrototypeProps = new Map<string, VObject>()
    valueTable.set('Array', new JSObject(arrayPrototypeProps))
}