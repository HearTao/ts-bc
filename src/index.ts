import VirtualMachine from './vm'
import { gen } from './gen'

export { default } from './vm'
export { gen } from './gen'

const code = `
const a = {
  foo: 1
}
function f (b) {
  return this.foo + b + 2
}
f.apply(a, [42])
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
