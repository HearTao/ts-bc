import VirtualMachine from './vm'
import { gen } from './gen'

export { default } from './vm'
export { gen } from './gen'

const code = `
function A () {
  const self = {}
  self.hehe = 1
  return self
}

A.prototype = {
  foo: function f() {
    return this.a + 2
  }
}

const a = new A()
a.hehe + a.foo()
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
