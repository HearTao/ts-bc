function foo() {

}

tsBcUtils.assertEquals('undefined', 'undefined', typeof undefined)
tsBcUtils.assertEquals('null', 'object', typeof null)
tsBcUtils.assertEquals('boolean', 'boolean', typeof true)
tsBcUtils.assertEquals('number', 'number', typeof 42)
tsBcUtils.assertEquals('string', 'string', typeof '42')
tsBcUtils.assertEquals('bridge', '[bridge]', typeof foo.call)
tsBcUtils.assertEquals('native', '[native]', typeof print)
tsBcUtils.assertEquals('function', 'function', typeof foo)
tsBcUtils.assertEquals('object', 'object', typeof { a: 42 })
