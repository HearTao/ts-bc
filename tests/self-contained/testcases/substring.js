{
  const str = 'Mozilla'

  tsBcUtils.assertEquals('1', 'oz', str.substring(1, 3))
  tsBcUtils.assertEquals('2', 'zilla', str.substring(2))
}
