import VirtualMachine from './vm'
import { gen } from './gen'

const code = `
var a = [1, 2, 3];
a[0]`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
