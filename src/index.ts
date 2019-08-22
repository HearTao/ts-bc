import VirtualMachine from "./vm";
import { gen } from "./gen";

const code = '0 ? 2 : 0 ? 3 : 4'
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value}`)
console.log(`eval: ${eval(code)}`)
