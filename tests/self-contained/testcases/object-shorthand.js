{
  const a = 42
  const b = { a }
  const o = { b }

  tsBcUtils.assertEquals('shorthand property', 42, o.b.a)
}
