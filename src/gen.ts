import * as ts from 'typescript'
import { OpCode, OpValue, Label } from './opcode'
import { EnvironmentType } from './types'
import { JSString, VObject, JSNumber } from './value'
import createVHost from 'ts-ez-host'
import { assertNever } from './utils'

interface LexerContext {
  locals?: ts.SymbolTable
  upValue: Set<string>
}

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
      case ts.SyntaxKind.VariableDeclarationList:
        visitVariableDeclarationList(<ts.VariableDeclarationList>node)
        break
      case ts.SyntaxKind.WhileStatement:
        visitWhileStatement(<ts.WhileStatement>node)
        break
      case ts.SyntaxKind.Identifier:
        visitIdentifier(<ts.Identifier>node)
        break
      case ts.SyntaxKind.Block:
        visitBlock(<ts.Block>node)
        break
      case ts.SyntaxKind.FunctionDeclaration:
        visitFunctionDeclaration(<ts.FunctionDeclaration>node)
        break
      case ts.SyntaxKind.FunctionExpression:
        visitFunctionExpression(<ts.FunctionExpression>node)
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
    obj.properties.forEach(prop => {
      if (ts.isPropertyAssignment(prop)) {
        visitor(prop.initializer)

        switch (prop.name.kind) {
          case ts.SyntaxKind.Identifier:
            visitLeftHandSideExpression(prop.name)
            break
          case ts.SyntaxKind.ComputedPropertyName:
          case ts.SyntaxKind.StringLiteral:
          case ts.SyntaxKind.NumericLiteral:
            visitor(prop.name)
            break
          default:
            assertNever(prop.name)
        }
      }
    })
    op.push(OpCode.CreateObject)
    op.push({ value: obj.properties.length })
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
    if (!ret.expression) {
      throw new Error('return must have expr')
    }
    visitor(ret.expression)
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

  function visitFunctionExpression(func: ts.FunctionExpression) {
    return visitFunctionLikeDeclaration(func)
  }

  function visitFunctionDeclaration(func: ts.FunctionDeclaration) {
    return visitFunctionLikeDeclaration(func)
  }

  function visitFunctionLikeDeclaration(func: ts.FunctionLikeDeclaration) {
    if (!func.body) {
      throw new Error('function must have body')
    }

    const label1 = createLabel()
    const label2 = createLabel()

    op.push(OpCode.Jump)
    op.push(label2)

    updateLabel(label1)
    func.parameters.forEach(visitor)

    pushConst(new JSString('arguments'))
    op.push(OpCode.Def)

    lexerContext.push({
      locals: func.locals,
      upValue: new Set()
    })

    if (ts.isBlock(func.body)) {
      func.body.statements.forEach(visitor)
    } else {
      visitor(func.body)
    }

    op.push(OpCode.Undefined)
    op.push(OpCode.Ret)
    updateLabel(label2)

    const context = lexerContext.pop()!
    context.upValue.forEach(u => pushConst(new JSString(u)))
    op.push(OpCode.Push)
    op.push({ value: context.upValue.size })

    op.push(OpCode.Push)
    op.push(label1)
    pushConst(new JSString((func.name as ts.Identifier).text))
    op.push(OpCode.CreateFunction)
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
      if (!context.locals!.has(id.text as ts.__String)) {
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
    switch (expr.operatorToken.kind) {
      case ts.SyntaxKind.EqualsToken: {
        visitor(expr.right)
        visitLeftHandSideExpression(expr.left)
        if (
          ts.isElementAccessExpression(expr.left) ||
          ts.isPropertyAccessExpression(expr.left)
        ) {
          op.push(OpCode.PropAssignment)
        } else {
          op.push(OpCode.Set)
        }
        break
      }
      case ts.SyntaxKind.PlusEqualsToken:
        {
          visitor(expr.right)
          visitor(expr.left)
          op.push(OpCode.Add)
          visitLeftHandSideExpression(expr.left)
          if (
            ts.isElementAccessExpression(expr.left) ||
            ts.isPropertyAccessExpression(expr.left)
          ) {
            op.push(OpCode.PropAssignment)
          } else {
            op.push(OpCode.Set)
          }
        }
        break
      default:
        throw new Error('not supported')
    }
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

  function visitPrefixUnaryExpression(prefix: ts.PrefixUnaryExpression) {
    switch (prefix.operator) {
      case ts.SyntaxKind.PlusPlusToken: {
        visitor(prefix.operand)
        op.push(OpCode.Push)
        op.push({ value: 1 })
        op.push(OpCode.Add)
        visitLeftHandSideExpression(<ts.LeftHandSideExpression>prefix.operand)
        op.push(OpCode.Set)
        visitor(prefix.operand)
        break
      }
      default:
        throw new Error('not supported')
    }
  }

  function visitLeftHandSideExpression(lhs: ts.LeftHandSideExpression) {
    switch (lhs.kind) {
      case ts.SyntaxKind.Identifier:
        pushConst(new JSString((<ts.Identifier>lhs).text))
        break
      case ts.SyntaxKind.ElementAccessExpression:
        visitor((<ts.ElementAccessExpression>lhs).argumentExpression)
        visitor((<ts.ElementAccessExpression>lhs).expression)
        break
      case ts.SyntaxKind.PropertyAccessExpression:
        pushConst(new JSString((<ts.PropertyAccessExpression>lhs).name.text))
        visitor((<ts.PropertyAccessExpression>lhs).expression)
        break
      default:
        throw new Error('not supported')
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
