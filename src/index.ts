import VirtualMachine from './vm'
import { gen } from './gen'

export { default } from './vm'
export { gen } from './gen'

const code = `
function foo() {
  return arguments[0]
}
foo(42)
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
