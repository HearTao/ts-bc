import { baz } from './export-cyclic-1'

export const foo = () => 'foo'

export const bar = () => 'bar'

export const foobarbaz = () => `${foo()}${bar()}${baz()}`
