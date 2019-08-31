import * as ts from 'typescript'
import { OpCode, OpValue, Label } from './opcode'
import { EnvironmentType, ObjectMemberType, LexerContext } from './types'
import { JSString, VObject, JSNumber, JSBoolean } from './value'
import createVHost from 'ts-ez-host'

export function gen(code: string): [(OpCode | OpValue)[], VObject[]] {
  const op: (OpCode | OpValue)[] = []
  const value: VObject[] = []

  const host = createVHost()
  const filename = 'mod.tsx'
  host.writeFile(filename, code, false)
  const program = ts.createProgram(
    [filename],
    {
      jsx: ts.JsxEmit.Preserve,
      experimentalDecorators: true,
      target: ts.ScriptTarget.Latest
    },
    host
  )

  const lexerContext: LexerContext[] = []
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(filename)

  ts.forEachChild(sourceFile!, visitor)

  return [op, value]

  function visitor(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.NumericLiteral:
        visitNumericLiteral(<ts.NumericLiteral>node)
        break
      case ts.SyntaxKind.StringLiteral:
        visitStringLiteral(<ts.StringLiteral>node)
        break
      case ts.SyntaxKind.BinaryExpression:
        visitBinaryExpression(<ts.BinaryExpression>node)
        break
      case ts.SyntaxKind.ParenthesizedExpression:
        visitor((<ts.ParenthesizedExpression>node).expression)
        break
      case ts.SyntaxKind.ConditionalExpression:
        visitConditionalExpression(<ts.ConditionalExpression>node)
        break
      case ts.SyntaxKind.PrefixUnaryExpression:
        visitPrefixUnaryExpression(<ts.PrefixUnaryExpression>node)
        break
      case ts.SyntaxKind.PostfixUnaryExpression:
        visitPostfixUnaryExpression(<ts.PostfixUnaryExpression>node)
        break
      case ts.SyntaxKind.VariableDeclarationList:
        visitVariableDeclarationList(<ts.VariableDeclarationList>node)
        break
      case ts.SyntaxKind.WhileStatement:
        visitWhileStatement(<ts.WhileStatement>node)
        break
      case ts.SyntaxKind.ForStatement:
        visitForStatement(<ts.ForStatement>node)
        break
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
        visitForInOrOfStatement(<ts.ForInStatement>node)
        break
      case ts.SyntaxKind.IfStatement:
        visitIfStatement(<ts.IfStatement>node)
        break
      case ts.SyntaxKind.Identifier:
        visitIdentifier(<ts.Identifier>node)
        break
      case ts.SyntaxKind.Block:
        visitBlock(<ts.Block>node)
        break
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        visitFunctionLikeDeclaration(<ts.FunctionLikeDeclaration>node)
        break
      case ts.SyntaxKind.CallExpression:
        visitCallExpression(<ts.CallExpression>node)
        break
      case ts.SyntaxKind.ReturnStatement:
        visitReturnStatement(<ts.ReturnStatement>node)
        break
      case ts.SyntaxKind.Parameter:
        visitParameter(<ts.ParameterDeclaration>node)
        break
      case ts.SyntaxKind.ElementAccessExpression:
        visitElementAccessExpression(<ts.ElementAccessExpression>node)
        break
      case ts.SyntaxKind.PropertyAccessExpression:
        visitPropertyAccessExpression(<ts.PropertyAccessExpression>node)
        break
      case ts.SyntaxKind.ArrayLiteralExpression:
        visitArrayLiteralExpression(<ts.ArrayLiteralExpression>node)
        break
      case ts.SyntaxKind.ObjectLiteralExpression:
        visitObjectLiteralExpression(<ts.ObjectLiteralExpression>node)
        break
      case ts.SyntaxKind.ThisKeyword:
        visitThisExpression(<ts.ThisExpression>node)
        break
      case ts.SyntaxKind.NewExpression:
        visitNewExpression(<ts.NewExpression>node)
        break
      case ts.SyntaxKind.SwitchStatement:
        visitSwitchStatement(<ts.SwitchStatement>node)
        break
      case ts.SyntaxKind.BreakStatement:
        visitBreakStatement(<ts.BreakStatement>node)
        break
      case ts.SyntaxKind.LabeledStatement:
        visitLabeledStatement(<ts.LabeledStatement>node)
        break
      default:
        ts.forEachChild(node, visitor)
    }
  }

  function createLabel(): Label {
    return { value: op.length }
  }

  function updateLabel(l: Label) {
    l.value = op.length
  }

  function pushConst(v: VObject) {
    value.push(v)
    op.push(OpCode.Const)
    op.push({ value: value.length - 1 })
  }

  function visitIfStatement(stmt: ts.IfStatement) {
    const label1 = createLabel()
    const label2 = createLabel()

    visitor(stmt.expression)

    op.push(OpCode.JumpIfFalse)
    op.push(label2)

    op.push(OpCode.EnterBlockScope)
    visitor(stmt.thenStatement)
    op.push(OpCode.ExitBlockScope)

    op.push(OpCode.Jump)
    op.push(label1)
    updateLabel(label2)

    if (stmt.elseStatement) {
      op.push(OpCode.EnterBlockScope)
      visitor(stmt.elseStatement)
      op.push(OpCode.ExitBlockScope)
    }
    updateLabel(label1)
  }

  function visitLabeledStatement(stmt: ts.LabeledStatement) {
    const label1 = createLabel()

    pushConst(new JSString(stmt.label.text))

    op.push(OpCode.EnterLabeledBlockScope)
    op.push(label1)

    visitor(stmt.statement)
    updateLabel(label1)
  }

  function visitBreakStatement(stmt: ts.BreakStatement) {
    if (stmt.label) {
      pushConst(new JSString(stmt.label.text))
      op.push(OpCode.BreakLabel)
    } else {
      op.push(OpCode.Break)
    }
  }

  function visitSwitchStatement(stmt: ts.SwitchStatement) {
    const label1 = createLabel()
    const label2 = createLabel()

    const clauses = stmt.caseBlock.clauses.map(
      clause => [createLabel(), clause] as const
    )
    const defaultClause = clauses.find(([_, clause]) =>
      ts.isDefaultClause(clause)
    )
    visitor(stmt.expression)

    op.push(OpCode.EnterIterableBlockScope)
    op.push(label2)

    clauses.forEach(([label, clause]) => {
      if (!ts.isDefaultClause(clause)) {
        op.push(OpCode.Dup)
        visitor(clause.expression)
        op.push(OpCode.StrictEQ)
        op.push(OpCode.JumpIfTrue)
        op.push(label)
      }
    })

    if (defaultClause) {
      op.push(OpCode.Jump)
      op.push(defaultClause[0])
    }

    clauses.forEach(([label, clause]) => {
      updateLabel(label)
      clause.statements.forEach(visitor)
    })

    updateLabel(label1)
    op.push(OpCode.ExitBlockScope)
    updateLabel(label2)
  }

  function visitForStatement(stmt: ts.ForStatement) {
    const label1 = createLabel()
    const label2 = createLabel()
    const label3 = createLabel()

    op.push(OpCode.EnterIterableBlockScope)
    op.push(label3)

    stmt.initializer && visitor(stmt.initializer)

    updateLabel(label1)
    if (stmt.condition) {
      visitor(stmt.condition)
    } else {
      pushConst(new JSBoolean(true))
    }

    op.push(OpCode.JumpIfFalse)
    op.push(label2)

    op.push(OpCode.EnterBlockScope)
    visitor(stmt.statement)
    op.push(OpCode.ExitBlockScope)

    stmt.incrementor && visitor(stmt.incrementor)
    op.push(OpCode.Jump)
    op.push(label1)

    updateLabel(label2)
    op.push(OpCode.ExitBlockScope)
    updateLabel(label3)
  }

  function visitForInitializer(initializer: ts.ForInitializer) {
    switch (initializer.kind) {
      case ts.SyntaxKind.VariableDeclarationList:
        const declList = <ts.VariableDeclarationList>initializer
        declList.declarations.forEach(decl => {
          pushConst(new JSString((<ts.Identifier>decl.name).text))

          switch (getVariableEnvirementType(declList)) {
            case EnvironmentType.block:
              op.push(OpCode.DefBlock)
              break
            default:
              op.push(OpCode.Def)
              break
          }
        })
    }
  }

  function visitForInOrOfStatement(stmt: ts.ForInOrOfStatement) {
    const label1 = createLabel()
    const label2 = createLabel()
    const label3 = createLabel()

    visitor(stmt.expression)
    if (ts.isForInStatement(stmt)) {
      op.push(OpCode.ForInStart)
    } else {
      op.push(OpCode.ForOfStart)
    }

    op.push(OpCode.EnterIterableBlockScope)
    op.push(label3)

    updateLabel(label1)
    op.push(OpCode.Dup)
    if (ts.isForInStatement(stmt)) {
      op.push(OpCode.ForInNext)
    } else {
      op.push(OpCode.ForOfNext)
    }
    op.push(OpCode.JumpIfTrue)
    op.push(label2)

    visitForInitializer(stmt.initializer)

    op.push(OpCode.EnterBlockScope)
    visitor(stmt.statement)
    op.push(OpCode.ExitBlockScope)

    op.push(OpCode.Jump)
    op.push(label1)
    updateLabel(label2)
    op.push(OpCode.ExitBlockScope)
    updateLabel(label3)
  }

  function visitNewExpression(expr: ts.NewExpression) {
    const label1 = createLabel()

    const args = expr.arguments || ([] as ts.Expression[])
    args.forEach(visitor)
    op.push(OpCode.Push)
    op.push({ value: args.length })
    visitor(expr.expression)
    op.push(OpCode.New)
    op.push(OpCode.Dup)

    op.push(OpCode.Undefined)
    op.push(OpCode.StrictEQ)

    op.push(OpCode.JumpIfFalse)
    op.push(label1)
    op.push(OpCode.Drop)
    updateLabel(label1)
  }

  function visitThisExpression(expr: ts.ThisExpression) {
    op.push(OpCode.This)
  }

  function visitPropertyAccessExpression(
    propAccess: ts.PropertyAccessExpression
  ) {
    visitor(propAccess.expression)
    pushConst(new JSString(propAccess.name.text))
    op.push(OpCode.PropAccess)
  }

  function visitObjectLiteralExpression(obj: ts.ObjectLiteralExpression) {
    obj.properties.forEach(visitObjectLiteralProperty)
    op.push(OpCode.CreateObject)
    op.push({ value: obj.properties.length })
  }

  function visitObjectLiteralProperty(prop: ts.ObjectLiteralElementLike) {
    switch (prop.kind) {
      case ts.SyntaxKind.PropertyAssignment: {
        visitor(prop.initializer)
        visitPropertyName(prop.name)
        pushConst(new JSNumber(ObjectMemberType.property))
        break
      }
      case ts.SyntaxKind.GetAccessor: {
        visitFunctionLikeDeclaration(prop)
        visitPropertyName(prop.name)
        pushConst(new JSNumber(ObjectMemberType.getter))
        break
      }
    }
  }

  function visitPropertyName(name: ts.PropertyName) {
    switch (name.kind) {
      case ts.SyntaxKind.Identifier:
        pushConst(new JSString(name.text))
        break
      case ts.SyntaxKind.ComputedPropertyName:
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NumericLiteral:
        visitor(name)
        break
    }
  }

  function visitArrayLiteralExpression(arr: ts.ArrayLiteralExpression) {
    arr.elements.forEach(visitor)
    op.push(OpCode.CreateArray)
    op.push({ value: arr.elements.length })
  }

  function visitElementAccessExpression(
    elementAccess: ts.ElementAccessExpression
  ) {
    visitor(elementAccess.expression)
    visitor(elementAccess.argumentExpression)
    op.push(OpCode.PropAccess)
  }

  function visitParameter(param: ts.ParameterDeclaration) {
    if (!ts.isIdentifier(param.name)) {
      throw new Error('not supported')
    }

    pushConst(new JSString(param.name.text))
    op.push(OpCode.Def)
  }

  function visitReturnStatement(ret: ts.ReturnStatement) {
    if (ret.expression) {
      visitor(ret.expression)
    } else {
      op.push(OpCode.Undefined)
    }
    op.push(OpCode.Ret)
  }

  function visitCallExpression(call: ts.CallExpression) {
    call.arguments.forEach(visitor)
    op.push(OpCode.Push)
    op.push({ value: call.arguments.length })
    visitor(call.expression)

    if (op[op.length - 1] === OpCode.PropAccess) {
      op[op.length - 1] = OpCode.CallMethod
    } else {
      op.push(OpCode.Call)
    }
  }

  function visitFunctionLikeDeclaration(func: ts.FunctionLikeDeclaration) {
    const body = func.body
    if (!body) {
      throw new Error('function must have body')
    }

    const label1 = createLabel()
    const label2 = createLabel()

    op.push(OpCode.Jump)
    op.push(label2)

    updateLabel(label1)
    func.parameters.forEach(visitor)

    lexerContext.push({
      func,
      upValue: new Set()
    })

    if (ts.isBlock(body)) {
      body.statements.forEach(visitor)
      op.push(OpCode.Undefined)
    } else {
      visitor(body)
    }
    op.push(OpCode.Ret)
    updateLabel(label2)

    const context = lexerContext.pop()!
    context.upValue.forEach(u => pushConst(new JSString(u)))
    op.push(OpCode.Push)
    op.push({ value: context.upValue.size })

    op.push(OpCode.Push)
    op.push(label1)
    pushConst(new JSNumber(func.parameters.length))

    if (!ts.isArrowFunction(func)) {
      if (func.name) {
        visitPropertyName(func.name)
      } else {
        pushConst(JSString.Empty)
      }
      op.push(OpCode.CreateFunction)
    } else {
      op.push(OpCode.CreateLambda)
    }
  }

  function visitBlock(block: ts.Block) {
    op.push(OpCode.EnterBlockScope)
    block.statements.forEach(visitor)
    op.push(OpCode.ExitBlockScope)
  }

  function visitNumericLiteral(node: ts.NumericLiteral) {
    pushConst(new JSNumber(+node.text))
  }

  function visitStringLiteral(node: ts.StringLiteral) {
    pushConst(new JSString(node.text))
  }

  function visitIdentifier(id: ts.Identifier) {
    pushConst(new JSString(id.text))
    op.push(OpCode.Load)

    if (lexerContext.length) {
      const context = lexerContext[lexerContext.length - 1]
      if (ts.isArrowFunction(context.func) || id.text !== 'arguments') {
        if (!context.func.locals!.has(id.text as ts.__String)) {
          context.upValue.add(id.text)
        }
      }
    }
  }

  function getVariableEnvirementType(
    variables: ts.VariableDeclarationList
  ): EnvironmentType {
    if (variables.flags & ts.NodeFlags.BlockScoped) {
      return EnvironmentType.block
    }
    return EnvironmentType.lexer
  }

  function visitVariableDeclarationList(variables: ts.VariableDeclarationList) {
    variables.declarations.forEach(
      visitVariableDeclaration.bind(null, getVariableEnvirementType(variables))
    )
  }

  function visitVariableDeclaration(
    type: EnvironmentType,
    variable: ts.VariableDeclaration
  ) {
    if (!variable.initializer) {
      return
    }

    visitor(variable.initializer)
    pushConst(new JSString((variable.name as ts.Identifier).text))

    switch (type) {
      case EnvironmentType.block:
        op.push(OpCode.DefBlock)
        break
      default:
        op.push(OpCode.Def)
        break
    }
  }

  function visitBinaryExpression(binary: ts.BinaryExpression) {
    switch (binary.operatorToken.kind) {
      case ts.SyntaxKind.MinusEqualsToken:
      case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
      case ts.SyntaxKind.AsteriskEqualsToken:
      case ts.SyntaxKind.SlashEqualsToken:
      case ts.SyntaxKind.PercentEqualsToken:
      case ts.SyntaxKind.AmpersandEqualsToken:
      case ts.SyntaxKind.BarEqualsToken:
      case ts.SyntaxKind.CaretEqualsToken:
      case ts.SyntaxKind.LessThanLessThanEqualsToken:
      case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
      case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
      case ts.SyntaxKind.EqualsToken:
      case ts.SyntaxKind.PlusEqualsToken:
        visitAssignmentExpression(binary as ts.AssignmentExpression<
          ts.AssignmentOperatorToken
        >)
        return
    }

    visitor(binary.left)
    visitor(binary.right)

    switch (binary.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        op.push(OpCode.Add)
        break
      case ts.SyntaxKind.MinusToken:
        op.push(OpCode.Sub)
        break
      case ts.SyntaxKind.AsteriskToken:
        op.push(OpCode.Mul)
        break
      case ts.SyntaxKind.SlashToken:
        op.push(OpCode.Div)
        break
      case ts.SyntaxKind.LessThanToken:
        op.push(OpCode.LT)
        break
      case ts.SyntaxKind.GreaterThanToken:
        op.push(OpCode.GT)
        break
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
        op.push(OpCode.StrictEQ)
        break
      case ts.SyntaxKind.ExclamationEqualsEqualsToken:
        op.push(OpCode.StrictNEQ)
        break
      default:
        throw new Error('not supported')
    }
  }

  function visitAssignmentExpression(
    expr: ts.AssignmentExpression<ts.AssignmentOperatorToken>
  ) {
    visitor(expr.right)

    if (expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      visitor(expr.left)

      switch (expr.operatorToken.kind) {
        case ts.SyntaxKind.PlusEqualsToken:
          {
            op.push(OpCode.Add)
          }
          break
        case ts.SyntaxKind.MinusEqualsToken: {
          op.push(OpCode.Sub)
          break
        }
        case ts.SyntaxKind.AsteriskAsteriskEqualsToken: {
          op.push(OpCode.Pow)
          break
        }
        case ts.SyntaxKind.AsteriskEqualsToken: {
          op.push(OpCode.Mul)
          break
        }
        case ts.SyntaxKind.SlashEqualsToken: {
          op.push(OpCode.Div)
          break
        }
        case ts.SyntaxKind.PercentEqualsToken: {
          op.push(OpCode.Mod)
          break
        }
        case ts.SyntaxKind.AmpersandEqualsToken: {
          op.push(OpCode.BitwiseAnd)
          break
        }
        case ts.SyntaxKind.BarEqualsToken: {
          op.push(OpCode.BitwiseOr)
          break
        }
        case ts.SyntaxKind.CaretEqualsToken: {
          op.push(OpCode.BitwiseXor)
          break
        }
        case ts.SyntaxKind.LessThanLessThanEqualsToken: {
          op.push(OpCode.LeftArithmeticShift)
          break
        }
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken: {
          op.push(OpCode.RightLogicalShift)
          break
        }
        case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken: {
          op.push(OpCode.RightArithmeticShift)
          break
        }
      }
    }

    visitLeftHandSideExpression(expr.left)
    op.push(OpCode.SetLeftValue)
  }

  function visitWhileStatement(stmt: ts.WhileStatement) {
    const label1 = createLabel()
    const label2 = createLabel()

    visitor(stmt.expression)
    op.push(OpCode.JumpIfFalse)
    op.push(label1)

    visitor(stmt.statement)

    op.push(OpCode.Jump)
    op.push(label2)
    updateLabel(label1)
  }

  function visitPrefixUnaryUpdateExpression(prefix: ts.PrefixUnaryExpression) {
    visitor(prefix.operand)
    op.push(OpCode.One)
    if (prefix.operator === ts.SyntaxKind.PlusPlusToken) {
      op.push(OpCode.Add)
    } else {
      op.push(OpCode.Sub)
    }
    op.push(OpCode.Dup)
    visitLeftHandSideExpression(prefix.operand)
    op.push(OpCode.SetLeftValue)
  }

  function visitPrefixUnaryExpression(prefix: ts.PrefixUnaryExpression) {
    switch (prefix.operator) {
      case ts.SyntaxKind.PlusPlusToken:
      case ts.SyntaxKind.MinusMinusToken:
        visitPrefixUnaryUpdateExpression(prefix)
        return
    }

    visitor(prefix.operand)
    switch (prefix.operator) {
      case ts.SyntaxKind.PlusToken: {
        op.push(OpCode.PrefixPlus)
        break
      }
      case ts.SyntaxKind.MinusToken: {
        op.push(OpCode.PrefixMinus)
        break
      }
      case ts.SyntaxKind.TildeToken: {
        op.push(OpCode.BitwiseNot)

        break
      }
      case ts.SyntaxKind.ExclamationToken: {
        op.push(OpCode.LogicalNot)
        break
      }
    }
  }

  function visitPostfixUnaryExpression(postfix: ts.PostfixUnaryExpression) {
    visitor(postfix.operand)
    op.push(OpCode.Dup)
    op.push(OpCode.One)
    if (postfix.operator === ts.SyntaxKind.PlusPlusToken) {
      op.push(OpCode.Add)
    } else {
      op.push(OpCode.Sub)
    }
    visitLeftHandSideExpression(postfix.operand)
    op.push(OpCode.SetLeftValue)
  }

  function visitLeftHandSideExpression(lhs: ts.UnaryExpression) {
    switch (lhs.kind) {
      case ts.SyntaxKind.Identifier:
        pushConst(new JSString((<ts.Identifier>lhs).text))
        op.push(OpCode.LoadLeftValue)
        break
      case ts.SyntaxKind.ElementAccessExpression:
        visitor((<ts.ElementAccessExpression>lhs).argumentExpression)
        visitor((<ts.ElementAccessExpression>lhs).expression)
        op.push(OpCode.LoadLeftValue)
        break
      case ts.SyntaxKind.PropertyAccessExpression:
        pushConst(new JSString((<ts.PropertyAccessExpression>lhs).name.text))
        visitor((<ts.PropertyAccessExpression>lhs).expression)
        op.push(OpCode.LoadLeftValue)
        break
      default:
        visitor(lhs)
        break
    }
  }

  function visitConditionalExpression(cond: ts.ConditionalExpression) {
    const label1 = createLabel()
    const label2 = createLabel()

    visitor(cond.condition)

    op.push(OpCode.JumpIfFalse)
    op.push(label2)

    visitor(cond.whenTrue)
    op.push(OpCode.Jump)
    op.push(label1)
    updateLabel(label2)

    visitor(cond.whenFalse)
    updateLabel(label1)
  }
}
