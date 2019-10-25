import { getForty } from './export-cyclic-2.js'

export const one = 1

const fortyOne = getForty() + one

export function getFortyTwo() {
  return fortyOne + one
}
