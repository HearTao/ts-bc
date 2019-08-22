import VirtualMachine from "./vm";
import { gen } from "./gen";

const code = '1 + (2 - 3) * 4'
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(vm.exec(), eval(code))
