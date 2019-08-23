import VirtualMachine from "./vm";
import { gen } from "./gen";

const code = `var a = 0;
while (a < 2) {
  ++a;
}
a`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value}`)
console.log(`eval: ${eval(code)}`)
