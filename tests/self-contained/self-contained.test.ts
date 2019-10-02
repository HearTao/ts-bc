import { Dirent, readdirSync, readFileSync } from 'fs'

import VirtualMachine, { gen, isOpCode, OpCode } from '../../src'

const PRINT_CODES = false

test(`check js code`, () => {
  const testDir = 'tests/self-contained/'
  const testcaseDir = `${testDir}testcases/`

  readdirSync(testcaseDir, { withFileTypes: true }).forEach(
    (testcase: Dirent) => {
      if (testcase.isFile()) {
        const fileContent = readFileSync(
          `${testcaseDir}/${testcase.name}`,
          'utf-8'
        )
        const [op, value] = gen(fileContent)

        if (PRINT_CODES) {
          console.log(`${testcase.name}: `)
          console.log(
            JSON.stringify(op.filter(isOpCode).map(n => OpCode[n]), null, 2)
          )
        }

        const vm = new VirtualMachine(op, value)

        vm.exec()

        console.log(`${testcase.name} ok`)
      }
    }
  )
})
