import VirtualMachine, { gen, JSString, VObject } from '../src'

const code = `
function foo() {
  for (let i = 0; i < 10; i++) {
    let a = {}
    // a.a = {}
  }
  return 42
}
foo()
gc()
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
// console.log(`eval: ${eval(code)}`)
