{
  const xs = [1,2,3]

  tsBcUtils.assertEquals('not found returns -1', -1, xs.indexOf(4))
}

{
  const xs = [1,2,3,1]

  tsBcUtils.assertEquals('returns first needle', 0, xs.indexOf(1))
}

{
  const xs = [4,1,undefined,'hello',null,{}]

  tsBcUtils.assertEquals('works on different types', 3, xs.indexOf('hello'))
}

{
  const xs = [4,1,undefined,'hello',null,{}]

  tsBcUtils.assertEquals('returns -1 for object', -1, xs.indexOf({}))
}

{
  const xs = "hello"

  tsBcUtils.assertEquals('indexOf on string', 1, xs.indexOf('ello'))
}

{
  const xs = "hello"

  tsBcUtils.assertEquals('indexOf on string', -1, xs.indexOf('ellow'))
}
