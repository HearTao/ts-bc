import { dummy } from './export-deep-3'
import { getBar } from './export-deep-2'

tsBcUtils.assertEquals('import/export', 'dummy', dummy)

export function foo() {
  return getBar()
}
