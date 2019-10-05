{
  var expr = 'Papayas'
  var res = ''
  switch (expr) {
    case 'Oranges':
      res = 'Oranges are $0.59 a pound.'
      break
    case 'Mangoes':
    case 'Papayas':
      res = 'Mangoes and papayas are $2.79 a pound.'
      break;
    default:
      res = 'Sorry, we are out of ' + expr + '.'
  }

  tsBcUtils.assertEquals('switch', "Mangoes and papayas are $2.79 a pound.", res)
}
