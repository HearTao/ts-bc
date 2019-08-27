import VirtualMachine from './vm'
import { gen } from './gen'

const code = `
var a = {
  a: 1,
  foo: function f () {
    return this.a
  }
};
a.foo()
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
