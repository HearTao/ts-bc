import VirtualMachine, { gen, JSString, VObject } from '../src'

const code = `

function numJewelsInStones(J, S) {
  let set = {}
  for (let v of J) {
      set[v] = true
  }
  let c = 0;
  for(let i = 0; i < S.length; ++i) {
      if (set[S[i]]) {
          c += 1
      }
  }
  return c
};

numJewelsInStones(a, b)
`
const [op, value] = gen(code)

console.log(op, value)
const vm = new VirtualMachine(op, value, 0, valueTable => {
  valueTable.set('a', new JSString('aA'))
  valueTable.set('b', new JSString('aAAbbbb'))
})

console.log(`code: ${code}`)
console.log(`vm: ${vm.exec().value.debugValue()}`)
// console.log(`eval: ${eval(code)}`)
