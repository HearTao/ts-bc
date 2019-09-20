import * as pupp from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'

let browser: pupp.Browser
let page: pupp.Page

const lib = {
  typescript: fs.readFileSync(
    path.resolve(__dirname, '../typescript.js'),
    'utf-8'
  ),
  browser: fs.readFileSync(
    path.resolve(__dirname, '../libs/browser.js'),
    'utf-8'
  )
}

beforeAll(async () => {
  browser = await pupp.launch()
  page = await browser.newPage()
  await page.evaluate(lib.typescript)
  await page.evaluate(lib.browser)
}, 1e9)

afterAll(async () => {
  await browser.close()
})

async function run(code: string): Promise<any> {
  if (!page) throw 42
  const wrap = `\
;(() => {
  const { default: VirtualMachine, gen } = TSBC
  const [op, value] = gen(\`${code}\`)
  const vm = new VirtualMachine(op, value)
  return vm.exec().value.debugValue()
})();`
  return await page.evaluate(wrap)
}

function testCode(code: string): void {
  test(code, () => expect(run(code)).resolves.toStrictEqual(eval(code)))
}

function testThrow(code: string, msg?: string): void {
  test(code, () => expect(run(code)).rejects.toThrow(msg))
}

describe(`binary`, () => {
  testCode(`0 ? 2 : 0 ? 3 : 4`)
  testCode(`1 + (2 - 3) * 4`)
  testCode(`1 < 2`)
  testCode(`1 > 2`)
})

describe(`variable`, () => {
  testCode(`var a = 1;a;`)
  testCode(`let a = 1;a;`)
  testCode(`const a = 1;a;`)
  testCode(`var a = 1;a ? a + 1 : 0`)
  testCode(`var a = 1;++a`)
  testCode(`var a = 0;while (a < 2) { ++a } a`)
  testThrow(
    `var a = 0;while (a < 2) { let b = a + 1; ++a } b`,
    `cannot find name b`
  )
  testCode(`let a = 1;a = 233;a`)
  testCode(`let a = 1;a += 233;a`)
})

describe(`call`, () => {
  testCode(`
  var a = 0;
  function f() { a = 1 }
  f()
  a;
  `)
  testCode(`
  function f() { return 42 }
  var a = f()
  a;
  `)
  testCode(`
  function f(a) { return 42 + a }
  var a = f(1)
  a;
  `)
  testCode(`
  function f(p) { return p === 0 ? p : p + f(p - 1) }
  var a = f(3)
  a;
  `)
  testCode(`
  var a = 0;
  function foo () {
    var a = 1;
    var i = 0;
    while (i < 1) {
      let a = 2
    }
  }
  a
  `)
  testCode(`
  function foo() {
    var a = 0;
    function bar () {
      a += 1;
      return a;
    }
    return bar;
  }
  var b = foo();
  b();
  b()
  `)
})

describe(`object & array`, () => {
  testCode(`
  var a = [1, 2, 3];
  a[0]
  `)
  testCode(`
  var a = {
    a: 1,
    'b': 2,
    ['c']: 3
  };
  [a['a'], a['b'], a['c']]
  `)
  test(`should work with Object.keys`, async () => {
    const code = `
      var a = {
        a: 1,
        b: 2,
        c: 3
      };
      Object['keys'](a)
    `

    const res = await run(code)
    return expect(res.sort()).toStrictEqual(eval(code).sort())
  })
})
