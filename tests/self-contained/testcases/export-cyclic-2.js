import { cyclicReference } from './import-cyclic.js'
import { one } from './export-cyclic-1.js'

const thirtyNine = cyclicReference

export const getForty = () => thirtyNine + one
