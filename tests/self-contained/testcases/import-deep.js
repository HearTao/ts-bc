import { foo as bar } from './export-deep-1'

tsBcUtils.assertEquals('import/export', 'bar', bar())
