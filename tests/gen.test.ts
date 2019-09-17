import VirtualMachine from '../src/vm'
import { gen } from '../src/gen'
import { ExecResult } from '../src/types'

function run(code: string) {
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)

  expect(vm.exec().value.debugValue()).toStrictEqual(eval(code))
}

function runUnorder(code: string) {
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)

  expect(
    vm
      .exec()
      .value.debugValue()
      .sort()
  ).toStrictEqual(eval(code).sort())
}

function stepRun(code: string) {
  const [op, value] = gen(code)
  const vm = new VirtualMachine(op, value)

  let result: ExecResult
  do {
    result = vm.exec(/* step */ true)
  } while (!result.finished)

  expect(result.value.debugValue()).toBe(eval(code))
}

test(`should work with condition`, () => {
  const code = '0 ? 2 : 0 ? 3 : 4'
  run(code)
})

test(`should work with binary expression`, () => {
  const code = '1 + (2 - 3) * 4'
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

test(`should work with var variable`, () => {
  const code = `
    var a = 1;
    a;
  `
  run(code)
})

test(`should work with let variable`, () => {
  const code = `
    let a = 1;
    a;
  `
  run(code)
})

test(`should work with const variable`, () => {
  const code = `
    const a = 1;
    a;
  `
  run(code)
})

test(`should crash with block scope`, () => {
  const code = `
    var a = 0;
    while (a < 2) {
      let b = a + 1
      ++a
    }
    b
  `

  expect(() => {
    run(code)
  }).toThrow('cannot find name b')
})

test(`should work with assignment`, () => {
  const code = `
  let a = 1;
  a = 233;
  a  
`
  run(code)
})

test(`should work with add assignment`, () => {
  const code = `
  let a = 1;
  a += 233;
  a  
`
  run(code)
})

test(`should work with call`, () => {
  const code = `
  var a = 0;
  function f() { a = 1 }
  f()
  a;
`
  run(code)
})

test(`should work with return`, () => {
  const code = `
  function f() { return 42 }
  var a = f()
  a;
`
  run(code)
})

test(`should work with args`, () => {
  const code = `
  function f(a) { return 42 + a }
  var a = f(1)
  a;
`
  run(code)
})

test(`should work with array`, () => {
  const code = `
    var a = [1, 2, 3];
    a[0]
  `
  run(code)
})

test(`should work with object literal`, () => {
  const code = `
    var a = {
      a: 1,
      'b': 2,
      ['c']: 3
    };
    [a['a'], a['b'], a['c']]
  `
  run(code)
})

test(`should work with object property assignment`, () => {
  const code = `
    var a = {
      a: 1,
      'b': 'a',
      ['c']: 'b'
    };
    a[a[a['c']]] = 2333;
    a['a']
  `
  run(code)
})

test(`should work with object property access`, () => {
  const code = `
    var a = {
      a: 1,
      'b': 'a',
      ['c']: 'b'
    };
    a.a = 2333;
    a.a
  `
  run(code)
})

test(`should work with recu`, () => {
  const code = `
  function f(p) { return p === 0 ? p : p + f(p - 1) }
  var a = f(3)
  a;
`
  run(code)
})

test(`should work with scopes`, () => {
  const code = `
    var a = 0;
    function foo () {
      var a = 1;
      var i = 0;
      while (i < 1) {
        let a = 2
      }
    }
    a
  `

  run(code)
})

test(`should work with upvalue`, () => {
  const code = `
    function foo() {
      var a = 0;
      function bar () {
        a += 1;
        for (let i = 0; i < 10; ++i) {}
        return a;
      }
      return bar;
    }
    var b = foo();
    b();
    b()
  `

  run(code)
})

test(`should work with this`, () => {
  const code = `
  var a = {
    a: 1,
    foo: function f () {
      return this.a
    }
  };
  a.foo()
  `
  run(code)
})

test(`should work with undefined this`, () => {
  const code = `
  var a = {
    foo: function f () {
      return this
    }
  };
  var f = a.foo;
  f()
  `
  run(code)
})

test(`should work with Object.keys`, () => {
  const code = `
    var a = {
      a: 1,
      b: 2,
      c: 3
    };
    Object['keys'](a)
  `
  runUnorder(code)
})

test(`should work with '__proto__' and 'prototype'`, () => {
  const code = `
    [Object.__proto__ === Function.prototype, Function.prototype === Function.__proto__, Function.prototype.__proto__ === Object.prototype]
  `

  runUnorder(code)
})

test(`should work with new Ctor`, () => {
  const code = `
    function A () {
      this.hehe = 1
    }

    const a = new A()
    a.hehe
  `
  run(code)
})

test(`should work with return new Ctor`, () => {
  const code = `
    function A () {
      const self = {};
      self.hehe = 1;
      return self
    }

    const a = new A()
    a.hehe
  `
  run(code)
})

test(`should work with prototype`, () => {
  const code = `
  function A () {
    this.hehe = 1
  }

  A.prototype.foo = function f () {
    return this.hehe + 1
  }

  const a = new A()
  a.foo()
`
  run(code)
})

test(`should work with getter`, () => {
  const code = `
  const a = {
    hehe: 1,
    get foo () {
      return 42 + this.hehe
    }
  }
  a.hehe = 2
  a.foo
`
  run(code)
})

test(`should work with array length`, () => {
  const code = `
  const a = [1, 2 ,3]
  a.length
`
  run(code)
})

test(`should work with array keys`, () => {
  const code = `
  const a = [1, 2 ,3]
  Object.keys(a)
`
  run(code)
})

test(`should work with call`, () => {
  const code = `
  const a = {
    foo: 1
  }
  function f (a) {
    return this.foo + a + 2
  }
  f.call(a, 42)
`
  run(code)
})

test(`should work with apply`, () => {
  const code = `
  const a = {
    foo: 1
  }
  function f (a) {
    return this.foo + a + 2
  }
  f.apply(a, [42])
`
  run(code)
})

test(`should work with bind`, () => {
  const code = `
  const a = {
    foo: 1
  }
  function f (a) {
    return this.foo + a + 2
  }
  const f1 = f.bind(a, 42)
  f1()
  `
  run(code)
})

test(`should work with for statement`, () => {
  const code = `
  let s = 0
  for (let i = 0; i < 100; ++i) {
    s += i
  }
  s
`
  run(code)
})

test(`should work with for in statement`, () => {
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
  runUnorder(code)
})

test(`should work with for of statement`, () => {
  const code = `
  const o = [1, 2, 3]
  const result = {}
  for (let k of o) {
    result[k] = k
  }
  Object.keys(result)
`
  runUnorder(code)
})

test(`should work with switch case statement`, () => {
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
  runUnorder(code)
})

test(`should break loop`, () => {
  const code = `
  let a = 0;
  for (let i = 0; i < 100; ++i) {
    a += i;
    if (i > 10) {
      break
    }
  }
  a
  `
  run(code)
})

test(`should break label`, () => {
  const code = `
  let a = 0;
  main: for (let i = 0; i < 10; ++i) {
    for (let j = 0; j < 10; ++j) {
      ++a;
      if (i > 5) {
        break main
      }
    }
  }
  a
  `
  run(code)
})

test(`should work with lambda`, () => {
  const code = `
    function foo() {
      return () => this.f
    }
    const o = { f: 1 }
    const c = foo.call(o)
    c()
  `
  run(code)
})

test(`should work with arguments`, () => {
  const code = `
    function foo() {
      return arguments[0]
    }
    foo(42)
  `
  run(code)
})

test(`should work with more lhs`, () => {
  const code = `
    function foo(a) {
      return {f: a}
    }
    foo(42).f++
  `
  run(code)
})

test(`should work with string index access`, () => {
  const code = `
    const str = 'abcdefg'
    str[str.length - 1]
  `
  run(code)
})

test(`should work with func toString`, () => {
  const code = `
    function a() {
      return 42;
    }
    a.toString()
  `
  run(code)
})

test(`should work with native func toString`, () => {
  const code = `
    Object.keys.toString()
  `
  run(code)
})

// test(`should work with callee`, () => {
//   const code = `
//   const f = (function (p) { return p === 0 ? p : p + arguments.callee(p - 1) })
//   f(3)
//   `
//   run(code)
// })

test(`should work with split and join`, () => {
  const code = `
    const s = '1.2.3.4'
    s.split('.').join('[.]')
  `
  run(code)
})

test(`should work with generator`, () => {
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

  expect(result.value.debugValue()).toBe(eval(code))
})
