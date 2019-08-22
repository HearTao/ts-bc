import { OpCode } from "./opcode";
import { Value } from './value'

export function assertValue(v: OpCode | Value): Value {
    if (typeof v === 'number') {
        throw new Error(`${v} is value`)
    }
    return v
}

export default class VirtualMachine {
    private stack: Value[] = []

    constructor (
        private codes: (OpCode | Value)[] = [],
        private values: Value[] = []
    ) {

    }

    private popStack () {
        const value = this.stack.pop()
        if (!value) throw new Error('no value')
        return value
    }

    private popCode () {
        const code = this.codes.pop()
        if (!code) throw new Error('no code')
        return code
    }

    exec () {
        const { codes, stack  } = this
        main: while (codes.length) {
            const op = codes.pop()
            switch (op) {
                case OpCode.Load:
                    stack.push(this.values[assertValue(this.popCode()).value])
                    break
                case OpCode.Add: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: left.value + right.value });
                    break;
                }
                case OpCode.Sub: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: left.value - right.value });
                    break;
                }
                case OpCode.Mul: {
                    const right = this.popStack()
                    const left = this.popStack()
                    stack.push({ value: left.value * right.value });
                    break;
                }
                case OpCode.Eof:
                    break main;
                default:
                    throw new Error('unexpected op')
            }
        }
        
        return this.popStack()
    }
}
