import VirtualMachine from './vm'
import { gen } from './gen'

export { default } from './vm'
export { gen } from './gen'

const code = `
function foo (a) {
  let r = 41
  switch (a) {
    case 0:
      return 'zero'
    case 1:
    case 2:
      return 'one or two'
    case 3:
      r += 1
      break
    default:
      return 'default'
  }
  return r
}
[foo(0), foo(1), foo(2), foo(3), foo(4)]
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
