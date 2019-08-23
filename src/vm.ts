import { OpCode } from "./opcode";
import { Value } from './value'

export function assertValue(v: OpCode | Value): Value {
    if (typeof v === 'number') {
        throw new Error(`${v} is value`)
    }
    return v
}

export function assertNumberValue(v: Value) {
    if (typeof v.value === 'string') {
        throw new Error(`${v} is string`)
    }
    return v.value
}

export function assertStringValue(v: Value) {
    if (typeof v.value === 'number') {
        throw new Error(`${v} is number`)
    }
    return v.value
}

export default class VirtualMachine {
    private stack: Value[] = []
    private environments: Map<string, Value>[] = [new Map()]

    constructor (
        private codes: (OpCode | Value)[] = [],
        private values: Value[] = [],
        private cur: number = 0
    ) {

    }

    private popStack () {
        const value = this.stack.pop()
        if (!value) throw new Error('no value')
        return value
    }

    private popCode () {
        const code = this.codes[this.cur++]
        if (!code) throw new Error('no code')
        return assertValue(code)
    }

    private currentEnv() {
        const env = this.environments[this.environments.length - 1]
        if (!env) throw new Error('no env')
        return env
    }

    exec () {
        const { codes, stack, environments } = this
        main: while (this.cur < codes.length) {
            const op = codes[this.cur++]

            switch (op) {
                case OpCode.Const:
                    stack.push(this.values[assertNumberValue(this.popCode())])
                    break
                case OpCode.Add: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: assertNumberValue(left) + assertNumberValue(right) });
                    break;
                }
                case OpCode.Sub: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: assertNumberValue(left) - assertNumberValue(right) });
                    break;
                }
                case OpCode.Mul: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: assertNumberValue(left) * assertNumberValue(right) });
                    break;
                }
                case OpCode.Div: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: assertNumberValue(left) / assertNumberValue(right) });
                    break;
                }
                    
                case OpCode.Jump: {
                    this.cur = assertNumberValue(this.popCode())
                    break;
                }
                    
                case OpCode.JumpIfFalse: {
                    const cond = this.popStack()
                    const pos = assertNumberValue(this.popCode())
                    if (!cond.value) {
                        this.cur = pos
                    }
                    break;
                }

                case OpCode.Push: {
                    stack.push(assertValue(this.popCode()))
                    break;
                }
                case OpCode.Def: {
                    const initializer = this.popStack()
                    const name = this.popStack()
                    const env = this.currentEnv()
                    env.set(assertStringValue(name), initializer)
                    break;
                }
                case OpCode.Load: {
                    const name = this.popStack()
                    const env = this.currentEnv()
                    const value = env.get(assertStringValue(name))
                    if (!value) {
                        throw new Error('unknown id: ' + name)
                    }
                    stack.push(value)
                    break;
                }

                case OpCode.Eof:
                    break main;
                default:
                    throw new Error('unexpected op: ' + op)
            }
        }
        
        return this.popStack()
    }
}
