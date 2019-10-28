import { readFileSync } from 'fs'

import VirtualMachine, { OpCode, gen, isOpCode } from '../../src'
import * as path from 'path'

const PRINT_CODES = false

{
  test('import-deep.js', () => {
    run('import-deep.js')
  })

  test('import-cyclic.js', () => {
    run('import-cyclic.js')
  })

  test('indexOf.js', () => {
    run('indexOf.js')
  })

  test('logical-or-and.js', () => {
    run('logical-or-and.js')
  })

  test('object-shorthand.js', () => {
    run('object-shorthand.js')
  })

  test('substring.js', () => {
    run('substring.js')
  })

  test('switch.js', () => {
    run('switch.js')
  })

  test('typeof.js', () => {
    run('typeof.js')
  })
}

function run(testname: string): void {
  const testcaseDir = 'tests/self-contained/testcases'
  const testCasePath = `${testcaseDir}/${testname}`

  const fileContent = readFileSync(testCasePath, 'utf-8')
  const [op, value] = gen(fileContent, { filepath: path.resolve(testCasePath) })

  if (PRINT_CODES) {
    console.log(`${testname}: `)
    console.log(
      JSON.stringify(op.filter(isOpCode).map(x => OpCode[x]), null, 2)
    )
  }

  const vm = new VirtualMachine(op, value)

  vm.exec()
}
