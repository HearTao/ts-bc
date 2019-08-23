import VirtualMachine from "../src/vm";
import { gen } from "../src/gen";
import { ExecResult } from "../src/types";

function run(code: string) {
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  expect(vm.exec().value.value).toBe(eval(code))
}

function stepRun(code: string) {
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)

  let result: ExecResult
  do {
    result = vm.exec(/* step */ true)
  } while (!result.finished)

  expect(result.value.value).toBe(eval(code))
}

test(`should work with condition`, () => {
  const code = '0 ? 2 : 0 ? 3 : 4'
  run(code)
})

test(`should work with binary expression`, () => {
  const code = '1 + (2 - 3) * 4'
  run(code)
})

test(`should work with def and load`, () => {
  const code = `
    var a = 1;
    a;
  `
  run(code)
})

test(`should work with var and cond`, () => {
  const code = `
    var a = 1;
    a ? a + 1 : 0;
  `
  run(code)
})

test(`should work with prefix unary`, () => {
  const code = `
    var a = 1;
    ++a
  `
  run(code)
})

test(`should work with lt`, () => {
  const code = '1 < 2'
  run(code)
})

test(`should work with gt`, () => {
  const code = '1 > 2'
  run(code)
})

test(`should work with while loop`, () => {
  const code = `
    var a = 0;
    while (a < 2) {
      ++a
    }
    a
  `
  run(code)
})

test(`should work with step exec`, () => {
  const code = '0 ? 2 : 0 ? 3 : 4'
  stepRun(code)
})

test(`should work with dump and load`, () => {
  const code = '0 ? 2 : 0 ? 3 : 4'
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)
  
  vm.exec(/* step */ true)
  const dump = vm.dump()

  const vm1 = new VirtualMachine()
  vm1.load(dump)

  let result: ExecResult
  do {
    result = vm1.exec(/* step */ true)
  } while (!result.finished)

  expect(result.value.value).toBe(eval(code))
})
