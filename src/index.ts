
import VirtualMachine from './vm'
import { gen } from './gen'

const code = `
var a = {
  a: 1,
  'b': 'a',
  ['c']: 'b'
};
a.a = 2333;
a.a`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
