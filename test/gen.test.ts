import VirtualMachine from "../src/vm";
import { gen } from "../src/gen";

test(`default`, () => {
  const code = '0 ? 2 : 0 ? 3 : 4'
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})


