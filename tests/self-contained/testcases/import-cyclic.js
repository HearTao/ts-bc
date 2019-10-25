import { getFortyTwo as getMagicNumber } from './export-cyclic-1.js'

export const cyclicReference = 39

if (getMagicNumber() !== undefined) {
  tsBcUtils.assertEquals('import/export', 42, getMagicNumber())
}
