import VirtualMachine, { gen } from '../src'

const code = `
function foo () {
  try {
    throw 1
    return 2
  } catch (e) {
    throw e + 4
  }
}
foo()
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
