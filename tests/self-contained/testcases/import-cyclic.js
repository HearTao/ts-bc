import { foobar } from './export-cyclic-1'
import { foobarbaz } from './export-cyclic-2'

tsBcUtils.assertEquals('import/export', 'foobar', foobar())
tsBcUtils.assertEquals('import/export', 'foobarbaz', foobarbaz())
