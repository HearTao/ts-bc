import { foo, bar } from './export-cyclic-2'

export const baz = () => 'baz'

export const foobar = () => `${foo()}${bar()}`
