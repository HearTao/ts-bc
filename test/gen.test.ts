import VirtualMachine from "../src/vm";
import { gen } from "../src/gen";

test(`should work with condition`, () => {
  const code = '0 ? 2 : 0 ? 3 : 4'
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})

test(`should work with binary expression`, () => {
  const code = '1 + (2 - 3) * 4'
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})

test(`should work with def and load`, () => {
  const code = `
    var a = 1;
    a;
  `
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})

test(`should work with var and cond`, () => {
  const code = `
    var a = 1;
    a ? a + 1 : 0;
  `
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})

test(`should work with prefix unary`, () => {
  const code = `
    var a = 1;
    ++a
  `
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})

test(`should work with lt`, () => {
  const code = '1 < 2'
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})

test(`should work with gt`, () => {
  const code = '1 > 2'
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})

test(`should work with while loop`, () => {
  const code = `
    var a = 0;
    while (a < 2) {
      ++a
    }
    a
  `
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value).toBe(eval(code))
})