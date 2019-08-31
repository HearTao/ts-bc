import VirtualMachine, { gen } from '../src'

const code = `
function foo(a) {
  return {f: a}
}
(foo(42).f)++
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
