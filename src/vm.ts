import { OpCode } from "./opcode";
import { Value } from './value'

export function assertValue(v: OpCode | Value): Value {
    if (typeof v === 'number') {
        throw new Error(`${v} is value`)
    }
    return v
}

export function assertNumberValue(v: Value) {
    if (typeof v.value !== 'number') {
        throw new Error(`${v} is ${typeof v.value}`)
    }
    return v.value
}

export interface VMDump {
    stack: Value[]
    environments: Map<string, Value>[]
    codes: (OpCode | Value)[]
    values: Value[]
    cur: number
}

export interface DoneResult {
    finished: true
    value: Value
}

export interface StepResult {
    finished: false
}

export type ExecResult = DoneResult | StepResult

export function assertStringValue(v: Value) {
    if (typeof v.value !== 'string') {
        throw new Error(`${v} is ${typeof v.value}`)
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

    dump (): VMDump {
        return {
            stack: this.stack,
            environments: this.environments,
            codes: this.codes,
            values: this.values,
            cur: this.cur
        }
    }

    step (): DoneResult {
        return this.exec()
    }

    public exec (step: true): ExecResult
    public exec (step?: false): DoneResult
    public exec (step?: boolean): ExecResult {
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

                case OpCode.LT: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: left.value < right.value});
                    break;
                }

                case OpCode.GT: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: left.value > right.value });
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
                case OpCode.Set: {
                    const name = this.popStack()
                    const value = this.popStack()
                    const env = this.currentEnv()
                    const nameText = assertStringValue(name)
                    if (!env.has(nameText)) {
                        throw new Error('cannot find: ' + nameText)
                    }
                    env.set(nameText, value)
                    break;
                }

                case OpCode.Eof:
                    break main;
                default:
                    throw new Error('unexpected op: ' + op)
            }

            if (step) {
                return {
                    finished: false
                }
            }
        }
        
        return {
            finished: true,
            value: this.popStack()
        }
    }
}
