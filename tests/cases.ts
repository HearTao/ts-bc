import VirtualMachine, { gen, JSString, VObject } from '../src'

const code = `
function foo() {
  var a = 0;
  function bar () {
    a += 1;
    for (let i = 0; i < 10; ++i) {
      a = a + i - i
    }
    return a;
  }
  return bar;
}
var b = foo();
b();
b()
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
console.log(`eval: ${eval(code)}`)
