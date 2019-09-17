import VirtualMachine, { gen, JSString, VObject } from '../src'

const code = `
function * foo(a) {
  yield a + 1
  yield a + 2
  yield (1 + (yield a + 3))
  return 42
}
var iter = foo(4)
iter.next()
iter.next()
iter.next()
;[iter.next(5), iter.next()]
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
vm.exec()
// console.log(`vm: ${.value.debugValue()}`)
// console.log(`eval: ${eval(code)}`)
