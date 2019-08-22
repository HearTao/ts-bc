import { OpCode } from "./opcode";
import { Value } from './value'

export default class VirtualMachine {
    private stack: Value[] = []

    constructor (
        private codes: OpCode[] = [],
        private values: Value[] = []
    ) {

    }

    private popStack () {
        const value = this.stack.pop()
        if (!value) throw new Error('no value')
        return value
    }

    private popValue () {
        const value = this.values.pop()
        if (!value) throw new Error('no value')
        return value
    }

    exec () {
        const { codes, stack  } = this
        while (codes.length) {

            const op = codes.pop()
            switch (op) {
                case OpCode.Push:
                    stack.push(this.popValue())
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
            }
        }
        
        return this.popStack()
    }
}
