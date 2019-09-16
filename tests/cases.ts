import VirtualMachine, { gen, JSString, VObject } from '../src'

const code = `
function fooo () {
  function foo() {
    var a = 0;
    var obj = {}
    function bar () {
      a += 1;
      obj.a = 1;
      for (let i = 0; i < 10; ++i) {
        let c = {}
        c.c = c
        c.d = {}
      }
      return a;
    }
    return bar;
  }
  var b = foo();
  b();
  b()
  print("gc count", gc())
}
fooo()
print("gc count", gc())
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)

console.log(`code: ${code}`)
vm.exec()
// console.log(`vm: ${.value.debugValue()}`)
// console.log(`eval: ${eval(code)}`)
