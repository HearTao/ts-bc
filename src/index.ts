import VirtualMachine from './vm'
import { gen } from './gen'

export { default } from './vm'
export { gen } from './gen'

const code = `
const o = {
  a: 1,
  b: 2
}
const result = {}
for (let k in o) {
  result[k] = 1
}
Object.keys(result)
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
