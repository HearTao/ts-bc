import VirtualMachine, { gen } from '../src'

const code = `
function a() {
  return 42;
}
a.toString()
`
const [op, value] = gen(code)

const vm = new VirtualMachine(op, value)
const vmJit = new VirtualMachine(op, value, 0, undefined, true)

function runInContext(cb: () => void) {
  const now = Date.now()
  cb()
  console.log('time:', Date.now() - now)
}

console.log(`code: ${code}`)

runInContext(() => {
  console.log(`vm: ${vm.exec().value.debugValue()}`)
})

runInContext(() => {
  console.log(`vmJit: ${vmJit.exec().value.debugValue()}`)
})

runInContext(() => {
  console.log(`native: ${eval(code)}`)
})
