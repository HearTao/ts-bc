import * as ts from 'typescript'
import { OpCode, OpValue, Label } from './opcode'
import { EnvironmentType, ObjectMemberType, LexerContext } from './types'
import { ConstantValue, ConstantValueType } from './value'
import createVHost from 'ts-ez-host'
import { last } from './utils'

export function gen(code: string): [(OpCode | OpValue)[], ConstantValue[]] {
  const op: (OpCode | OpValue)[] = []
  const constants: ConstantValue[] = []

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

  return [op, constants]

  function visitor(node: ts.Node): void {
    switch (node.kind) {
      case ts.SyntaxKind.NumericLiteral:
        visitNumericLiteral(node as ts.NumericLiteral)
        break
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      case ts.SyntaxKind.StringLiteral:
        visitStringLiteral(node as ts.StringLiteral)
        break
      case ts.SyntaxKind.BinaryExpression:
        visitBinaryExpression(node as ts.BinaryExpression)
        break
      case ts.SyntaxKind.ParenthesizedExpression:
        visitor((node as ts.ParenthesizedExpression).expression)
        break
      case ts.SyntaxKind.ConditionalExpression:
        visitConditionalExpression(node as ts.ConditionalExpression)
        break
      case ts.SyntaxKind.PrefixUnaryExpression:
        visitPrefixUnaryExpression(node as ts.PrefixUnaryExpression)
        break
      case ts.SyntaxKind.PostfixUnaryExpression:
        visitPostfixUnaryExpression(node as ts.PostfixUnaryExpression)
        break
      case ts.SyntaxKind.VariableDeclarationList:
        visitVariableDeclarationList(node as ts.VariableDeclarationList)
        break
      case ts.SyntaxKind.WhileStatement:
        visitWhileStatement(node as ts.WhileStatement)
        break
      case ts.SyntaxKind.ForStatement:
        visitForStatement(node as ts.ForStatement)
        break
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
        visitForInOrOfStatement(node as ts.ForInStatement)
        break
      case ts.SyntaxKind.IfStatement:
        visitIfStatement(node as ts.IfStatement)
        break
      case ts.SyntaxKind.Identifier:
        visitIdentifier(node as ts.Identifier)
        break
      case ts.SyntaxKind.Block:
        visitBlock(node as ts.Block)
        break
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        visitFunctionLikeDeclaration(node as ts.FunctionLikeDeclaration)
        break
      case ts.SyntaxKind.CallExpression:
        visitCallExpression(node as ts.CallExpression)
        break
      case ts.SyntaxKind.ReturnStatement:
        visitReturnStatement(node as ts.ReturnStatement)
        break
      case ts.SyntaxKind.Parameter:
        visitParameter(node as ts.ParameterDeclaration)
        break
      case ts.SyntaxKind.ElementAccessExpression:
        visitElementAccessExpression(node as ts.ElementAccessExpression)
        break
      case ts.SyntaxKind.PropertyAccessExpression:
        visitPropertyAccessExpression(node as ts.PropertyAccessExpression)
        break
      case ts.SyntaxKind.ArrayLiteralExpression:
        visitArrayLiteralExpression(node as ts.ArrayLiteralExpression)
        break
      case ts.SyntaxKind.ObjectLiteralExpression:
        visitObjectLiteralExpression(node as ts.ObjectLiteralExpression)
        break
      case ts.SyntaxKind.ThisKeyword:
        visitThisExpression(node as ts.ThisExpression)
        break
      case ts.SyntaxKind.NewExpression:
        visitNewExpression(node as ts.NewExpression)
        break
      case ts.SyntaxKind.SwitchStatement:
        visitSwitchStatement(node as ts.SwitchStatement)
        break
      case ts.SyntaxKind.BreakStatement:
        visitBreakStatement(node as ts.BreakStatement)
        break
      case ts.SyntaxKind.LabeledStatement:
        visitLabeledStatement(node as ts.LabeledStatement)
        break
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
        visitBooleanLiteral(node as ts.BooleanLiteral)
        break
      case ts.SyntaxKind.YieldExpression:
        visitYieldExpression(node as ts.YieldExpression)
        break
      case ts.SyntaxKind.TryStatement:
        visitTryStatement(node as ts.TryStatement)
        break
      case ts.SyntaxKind.ThrowStatement:
        visitThrowStatement(node as ts.ThrowStatement)
        break
      case ts.SyntaxKind.TemplateExpression:
        visitTemplateExpression(node as ts.TemplateExpression)
        break
      default:
        ts.forEachChild(node, visitor)
    }
  }

  function createLabel(): Label {
    return { value: op.length }
  }

  function updateLabel(l: Label): void {
    l.value = op.length
  }

  function pushConst(value: string | number | boolean): void {
    switch (typeof value) {
      case 'string':
        constants.push({
          type: ConstantValueType.string,
          value
        })
        break
      case 'number':
        constants.push({
          type: ConstantValueType.number,
          value
        })
        break
      case 'boolean':
        constants.push({
          type: ConstantValueType.boolean,
          value
        })
        break
    }

    op.push(OpCode.Const)
    op.push({ value: constants.length - 1 })
  }

  function visitYieldExpression(expr: ts.YieldExpression): void {
    if (!expr.expression) {
      op.push(OpCode.Undefined)
    } else {
      visitor(expr.expression)
    }
    op.push(OpCode.Yield)
  }

  function visitThrowStatement(stmt: ts.ThrowStatement): void {
    if (!stmt.expression) {
      op.push(OpCode.Undefined)
    } else {
      visitor(stmt.expression)
    }
    op.push(OpCode.Throw)
  }

  function visitCatchClause(clause: ts.CatchClause): void {
    op.push(OpCode.EnterBlockScope)

    pushConst((clause.variableDeclaration!.name as ts.Identifier).text)
    op.push(OpCode.DefBlock)

    visitor(clause.block)
    op.push(OpCode.ExitBlockScope)
  }

  function visitTryStatement(stmt: ts.TryStatement): void {
    const label1 = createLabel()
    const label2 = createLabel()

    op.push(OpCode.EnterTryBlockScope)
    op.push(label2)

    visitor(stmt.tryBlock)

    op.push(OpCode.ExitBlockScope)

    op.push(OpCode.Jump)
    op.push(label1)

    updateLabel(label2)
    visitCatchClause(stmt.catchClause!)

    updateLabel(label1)
  }

  function visitInBlockScope<T extends ts.Node>(stmt: T, cb: () => void): void {
    if (stmt.locals && lexerContext.length) {
      lexerContext[lexerContext.length - 1].locals.push(stmt.locals)
    }
    cb()
    if (stmt.locals && lexerContext.length) {
      lexerContext[lexerContext.length - 1].locals.pop()
    }
  }

  function visitBooleanLiteral(lit: ts.BooleanLiteral): void {
    switch (lit.kind) {
      case ts.SyntaxKind.TrueKeyword:
        op.push(OpCode.True)
        break
      case ts.SyntaxKind.FalseKeyword:
        op.push(OpCode.False)
        break
    }
  }

  function visitIfStatement(stmt: ts.IfStatement): void {
    const label1 = createLabel()
    const label2 = createLabel()

    visitor(stmt.expression)

    op.push(OpCode.JumpIfFalse)
    op.push(label2)

    op.push(OpCode.EnterBlockScope)
    visitInBlockScope(stmt.thenStatement, (): void =>
      visitor(stmt.thenStatement)
    )
    op.push(OpCode.ExitBlockScope)

    op.push(OpCode.Jump)
    op.push(label1)
    updateLabel(label2)

    if (stmt.elseStatement) {
      const elseStatement = stmt.elseStatement
      op.push(OpCode.EnterBlockScope)
      visitInBlockScope(elseStatement, (): void => visitor(elseStatement))
      op.push(OpCode.ExitBlockScope)
    }
    updateLabel(label1)
  }

  function visitLabeledStatement(stmt: ts.LabeledStatement): void {
    const label1 = createLabel()

    pushConst(stmt.label.text)

    op.push(OpCode.EnterLabeledBlockScope)
    op.push(label1)

    visitInBlockScope(stmt.statement, (): void => visitor(stmt.statement))

    updateLabel(label1)
  }

  function visitBreakStatement(stmt: ts.BreakStatement): void {
    if (stmt.label) {
      pushConst(stmt.label.text)
      op.push(OpCode.BreakLabel)
    } else {
      op.push(OpCode.Break)
    }
  }

  function visitSwitchStatement(stmt: ts.SwitchStatement): void {
    const label1 = createLabel()
    const label2 = createLabel()

    const clauses = stmt.caseBlock.clauses.map(
      clause => [createLabel(), clause] as const
    )
    const defaultClause = clauses.find(([_, clause]): boolean =>
      ts.isDefaultClause(clause)
    )
    visitor(stmt.expression)

    op.push(OpCode.EnterIterableBlockScope)
    op.push(label2)

    visitInBlockScope(stmt, (): void => {
      clauses.forEach(([label, clause]): void => {
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

      clauses.forEach(([label, clause]): void => {
        updateLabel(label)
        clause.statements.forEach(visitor)
      })
    })

    updateLabel(label1)
    op.push(OpCode.ExitBlockScope)
    updateLabel(label2)
  }

  function visitForStatement(stmt: ts.ForStatement): void {
    const label1 = createLabel()
    const label2 = createLabel()
    const label3 = createLabel()

    op.push(OpCode.EnterIterableBlockScope)
    op.push(label3)

    visitInBlockScope(stmt, (): void => {
      stmt.initializer && visitor(stmt.initializer)

      updateLabel(label1)
      if (stmt.condition) {
        visitor(stmt.condition)
      } else {
        pushConst(true)
      }

      op.push(OpCode.JumpIfFalse)
      op.push(label2)

      op.push(OpCode.EnterBlockScope)
      visitInBlockScope(stmt.statement, (): void => visitor(stmt.statement))
      op.push(OpCode.ExitBlockScope)

      stmt.incrementor && visitor(stmt.incrementor)
      op.push(OpCode.Jump)
      op.push(label1)
    })

    updateLabel(label2)
    op.push(OpCode.ExitBlockScope)
    updateLabel(label3)
  }

  function visitForInitializer(initializer: ts.ForInitializer): void {
    switch (initializer.kind) {
      case ts.SyntaxKind.VariableDeclarationList: {
        const declList = initializer as ts.VariableDeclarationList
        declList.declarations.forEach((decl): void => {
          pushConst((decl.name as ts.Identifier).text)

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
  }

  function visitForInOrOfStatement(stmt: ts.ForInOrOfStatement): void {
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

    visitInBlockScope(stmt, (): void => {
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
      visitInBlockScope(stmt.statement, (): void => visitor(stmt.statement))
      op.push(OpCode.ExitBlockScope)

      op.push(OpCode.Jump)
      op.push(label1)
    })

    updateLabel(label2)
    op.push(OpCode.ExitBlockScope)
    updateLabel(label3)
  }

  function visitNewExpression(expr: ts.NewExpression): void {
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

  function visitThisExpression(_expr: ts.ThisExpression): void {
    op.push(OpCode.This)
  }

  function visitPropertyAccessExpression(
    propAccess: ts.PropertyAccessExpression
  ): void {
    visitor(propAccess.expression)
    pushConst(propAccess.name.text)
    op.push(OpCode.PropAccess)
  }

  function visitObjectLiteralExpression(obj: ts.ObjectLiteralExpression): void {
    obj.properties.forEach(visitObjectLiteralProperty)
    op.push(OpCode.CreateObject)
    op.push({ value: obj.properties.length })
  }

  function visitObjectLiteralProperty(prop: ts.ObjectLiteralElementLike): void {
    switch (prop.kind) {
      case ts.SyntaxKind.PropertyAssignment: {
        visitor(prop.initializer)
        visitPropertyName(prop.name)
        pushConst(ObjectMemberType.property)
        break
      }
      case ts.SyntaxKind.GetAccessor: {
        visitFunctionLikeDeclaration(prop)
        visitPropertyName(prop.name)
        pushConst(ObjectMemberType.getter)
        break
      }
    }
  }

  function visitPropertyName(name: ts.PropertyName): void {
    switch (name.kind) {
      case ts.SyntaxKind.Identifier:
        pushConst(name.text)
        break
      case ts.SyntaxKind.ComputedPropertyName:
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NumericLiteral:
        visitor(name)
        break
    }
  }

  function visitArrayLiteralExpression(arr: ts.ArrayLiteralExpression): void {
    arr.elements.forEach(visitor)
    op.push(OpCode.CreateArray)
    op.push({ value: arr.elements.length })
  }

  function visitElementAccessExpression(
    elementAccess: ts.ElementAccessExpression
  ): void {
    visitor(elementAccess.expression)
    visitor(elementAccess.argumentExpression)
    op.push(OpCode.PropAccess)
  }

  function visitParameter(param: ts.ParameterDeclaration): void {
    if (!ts.isIdentifier(param.name)) {
      throw new Error('not supported')
    }

    pushConst(param.name.text)
    op.push(OpCode.Def)
  }

  function visitReturnStatement(ret: ts.ReturnStatement): void {
    if (ret.expression) {
      visitor(ret.expression)
    } else {
      op.push(OpCode.Undefined)
    }

    if (lexerContext[lexerContext.length - 1].func.asteriskToken) {
      op.push(OpCode.GeneratorReturn)
    } else {
      op.push(OpCode.Ret)
    }
  }

  function visitCallExpression(call: ts.CallExpression): void {
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

  function visitGeneratorDeclaration(func: ts.FunctionDeclaration): void {
    const body = func.body
    if (!body) {
      throw new Error('function must have body')
    }

    const label1 = createLabel()
    const label2 = createLabel()
    const label3 = createLabel()
    const label4 = createLabel()

    op.push(OpCode.Jump)
    op.push(label2)

    updateLabel(label1)
    func.parameters.forEach(visitor)

    op.push(OpCode.Jump)
    op.push(label3)

    lexerContext.push({
      func,
      upValue: new Set(),
      locals: []
    })
    updateLabel(label4)

    body.statements.forEach(visitor)
    op.push(OpCode.GeneratorReturn)

    updateLabel(label3)

    op.push(OpCode.CreateGeneratorContext)
    op.push(label4)

    op.push(OpCode.Ret)

    updateLabel(label2)

    const context = lexerContext.pop()!
    context.upValue.forEach(u => pushConst(u))
    op.push(OpCode.Push)
    op.push({ value: context.upValue.size })

    op.push(OpCode.Push)
    op.push(label1)
    pushConst(func.parameters.length)

    if (func.name) {
      visitPropertyName(func.name)
    } else {
      pushConst('')
    }
    pushConst(func.getText())
    op.push(OpCode.CreateGenerator)
  }

  function visitFunctionLikeDeclaration(
    func: ts.FunctionLikeDeclaration
  ): void {
    if (func.asteriskToken) {
      if (ts.isFunctionDeclaration(func)) {
        return visitGeneratorDeclaration(func)
      }
      throw new Error('generator support func declaration only')
    }

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
      upValue: new Set(),
      locals: []
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
    context.upValue.forEach((u): void => pushConst(u))
    op.push(OpCode.Push)
    op.push({ value: context.upValue.size })

    op.push(OpCode.Push)
    op.push(label1)
    pushConst(func.parameters.length)

    if (!ts.isArrowFunction(func)) {
      if (func.name) {
        visitPropertyName(func.name)
      } else {
        pushConst('')
      }
      pushConst(func.getText())
      op.push(OpCode.CreateFunction)
    } else {
      pushConst(func.getText())
      op.push(OpCode.CreateLambda)
    }
  }

  function visitBlock(block: ts.Block): void {
    op.push(OpCode.EnterBlockScope)
    visitInBlockScope(block, () => block.statements.forEach(visitor))
    op.push(OpCode.ExitBlockScope)
  }

  function visitNumericLiteral(node: ts.NumericLiteral): void {
    pushConst(+node.text)
  }

  function visitStringLiteral(node: ts.StringLiteral): void {
    pushConst(node.text)
  }

  function visitIdentifier(id: ts.Identifier): void {
    pushConst(id.text)
    op.push(OpCode.Load)

    if (lexerContext.length) {
      const context = last(lexerContext)
      const symbol = checker.getSymbolAtLocation(id)
      if (
        symbol &&
        symbol.valueDeclaration &&
        (symbol.valueDeclaration.pos < context.func.pos ||
          context.func.pos >= symbol.valueDeclaration.end)
      ) {
        context.upValue.add(id.text)
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

  function visitVariableDeclarationList(
    variables: ts.VariableDeclarationList
  ): void {
    variables.declarations.forEach(
      visitVariableDeclaration.bind(null, getVariableEnvirementType(variables))
    )
  }

  function visitVariableDeclaration(
    type: EnvironmentType,
    variable: ts.VariableDeclaration
  ): void {
    if (!variable.initializer) {
      return
    }

    visitor(variable.initializer)
    pushConst((variable.name as ts.Identifier).text)

    switch (type) {
      case EnvironmentType.block:
        op.push(OpCode.DefBlock)
        break
      default:
        op.push(OpCode.Def)
        break
    }
  }

  function visitBinaryExpression(binary: ts.BinaryExpression): void {
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
  ): void {
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

  function visitWhileStatement(stmt: ts.WhileStatement): void {
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

  function visitPrefixUnaryUpdateExpression(
    prefix: ts.PrefixUnaryExpression
  ): void {
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

  function visitPrefixUnaryExpression(prefix: ts.PrefixUnaryExpression): void {
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

  function visitPostfixUnaryExpression(
    postfix: ts.PostfixUnaryExpression
  ): void {
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

  function visitLeftHandSideExpression(lhs: ts.UnaryExpression): void {
    switch (lhs.kind) {
      case ts.SyntaxKind.Identifier:
        pushConst((lhs as ts.Identifier).text)
        op.push(OpCode.LoadLeftValue)
        break
      case ts.SyntaxKind.ElementAccessExpression:
        visitor((lhs as ts.ElementAccessExpression).argumentExpression)
        visitor((lhs as ts.ElementAccessExpression).expression)
        op.push(OpCode.LoadLeftValue)
        break
      case ts.SyntaxKind.PropertyAccessExpression:
        pushConst((lhs as ts.PropertyAccessExpression).name.text)
        visitor((lhs as ts.PropertyAccessExpression).expression)
        op.push(OpCode.LoadLeftValue)
        break
      default:
        visitor(lhs)
        break
    }
  }

  function visitConditionalExpression(cond: ts.ConditionalExpression): void {
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

  function visitTemplateExpression(
    templateExpression: ts.TemplateExpression
  ): void {
    // Transform `A ${1} b ${2} c` to ["A ", 1, " b ", 2, " c"].join("")

    pushConst('')

    op.push(OpCode.Push)
    op.push({ value: 1 })

    pushConst(templateExpression.head.text)

    templateExpression.templateSpans.forEach((templateSpan): void => {
      visitor(templateSpan.expression)
      pushConst(templateSpan.literal.text)
    })

    // one head plus expression and literal for each template span
    const len = 1 + 2 * templateExpression.templateSpans.length
    op.push(OpCode.CreateArray)
    op.push({ value: len })

    pushConst('join')

    op.push(OpCode.CallMethod)
  }
}
