import VirtualMachine, { gen } from '../src'

const code = `
const o = [1, 2, 3]
  const result = {}
  for (let k of o) {
    result[k] = k
  }
  Object.keys(result)
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
