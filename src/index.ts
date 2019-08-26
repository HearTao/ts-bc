import VirtualMachine from './vm'
import { gen } from './gen'

const code = `
function f(p) { return p === 0 ? p : p + f(p - 1) }
var a = f(3)
a;`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.value}`)
console.log(`eval: ${eval(code)}`)
