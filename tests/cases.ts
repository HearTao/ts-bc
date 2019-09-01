import VirtualMachine, { gen, JSString, VObject } from '../src'

const code = `
function foo(s) {
  return s.split('.').join('[.]')
}
foo(value)
`
const [op, value] = gen(code)

console.log(op, value)
const vm = new VirtualMachine(op, value, 0, valueTable => {
  valueTable.set('value', new JSString('1.2.3.4'))
})

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
// console.log(`eval: ${eval(code)}`)
