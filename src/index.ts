import VirtualMachine from './vm'
import { gen } from './gen'

const code = `
var a = {
    a: 1,
    'b': 2,
    ['c']: 3
  };
  a['b'] = 2333;
  a['b']`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
