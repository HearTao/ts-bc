import VirtualMachine, { gen } from '../src'

const code = `
let a = 0;
  main: for (let i = 0; i < 10; ++i) {
    for (let j = 0; j < 10; ++j) {
      ++a;
      if (i > 5) {
        break main
      }
    }
  }
  a
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
