import VirtualMachine, { gen } from '../src'

const code = `
const s = '1.2.3.4'
s.split('.').join('[.]')
`
const [op, value] = gen(code)

console.log(op, value)
const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
