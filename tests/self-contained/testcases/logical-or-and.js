
{
  tsBcUtils.assertEquals('operator precedence 1', true, true || false && false)
  tsBcUtils.assertEquals('operator precedence 2', false, (true || false) && false)
}

{
  tsBcUtils.assertEquals('and 1', true, true && true)
  tsBcUtils.assertEquals('and 2', false, true && false)
  tsBcUtils.assertEquals('and 3', false, false && true)
  tsBcUtils.assertEquals('and 4', 'Dog', 'Cat' && 'Dog')
  tsBcUtils.assertEquals('and 5', false, false && 'Cat')
  tsBcUtils.assertEquals('and 6', false, 'Cat' && false)
  tsBcUtils.assertEquals('and 7', '', '' && false)
  tsBcUtils.assertEquals('and 8', false, false && '')
}

{
  tsBcUtils.assertEquals('or 1', true, true || true)
  tsBcUtils.assertEquals('or 2', true, false || true)
  tsBcUtils.assertEquals('or 3', true, true || false)
  tsBcUtils.assertEquals('or 4', 'Cat', 'Cat' || 'Dog')
  tsBcUtils.assertEquals('or 5', 'Cat', false || 'Cat')
  tsBcUtils.assertEquals('or 6', 'Cat', 'Cat' || false)
  tsBcUtils.assertEquals('or 7', false, '' || false)
  tsBcUtils.assertEquals('or 8', '', false || '')
  tsBcUtils.assertEquals('or 9', { a: 42 }, false || { a: 42 })
}
