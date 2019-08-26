import { VObject, JSObject } from "./value";

export function initPrototype (valueTable: Map<string, VObject>) {
    initArrayPrototype(valueTable)
}

function initArrayPrototype (valueTable: Map<string, VObject>) {
    const arrayPrototypeProps = new Map<string, VObject>()

    valueTable.set('Array', new JSObject(arrayPrototypeProps))
}