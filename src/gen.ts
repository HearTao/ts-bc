import * as ts from 'typescript'
import { OpCode } from './opcode'
import { Value } from './value'
import { EnvironmentType, StackFrame } from './types'

export function gen(code: string): [(OpCode | Value)[], Value[]] {
  const op: (OpCode | Value)[] = []
  const value: Value[] = []

  ts.forEachChild(
    ts.createSourceFile('', code, ts.ScriptTarget.Latest),
    visitor
  )

  return [op, value]

  function visitor(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.NumericLiteral:
        visitNumericLiteral(<ts.NumericLiteral>node)
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
      case ts.SyntaxKind.CallExpression:
        visitCallExpression(<ts.CallExpression>node)
        break
      case ts.SyntaxKind.ReturnStatement:
        visitReturnStatement(<ts.ReturnStatement>node)
        break
      case ts.SyntaxKind.Parameter:
        visitParameter(<ts.ParameterDeclaration>node)
        break
      default:
        ts.forEachChild(node, visitor)
    }
  }

  function visitParameter(param: ts.ParameterDeclaration) {
    if (!ts.isIdentifier(param.name)) {
      throw new Error('not supported')
    }

    op.push(OpCode.Push)
    op.push({ value: param.name.text})
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
    op.push(OpCode.Call)
  }

  function visitFunctionDeclaration(func: ts.FunctionDeclaration) {
    const label1: Value = { value: 0 }
    const label2: Value = { value: 0 }

    op.push(OpCode.Jump)
    op.push(label2)

    label1.value = op.length
    func.parameters.forEach(visitor)
    func.body!.statements.forEach(visitor)

    op.push(OpCode.Push)
    op.push({ value: 0 })
    op.push(OpCode.Ret)

    label2.value = op.length

    op.push(OpCode.Push)
    op.push(label1)
    op.push(OpCode.Push)
    op.push({ value: (func.name as ts.Identifier).text })
    op.push(OpCode.Def)
  }

  function visitBlock(block: ts.Block) {
    op.push(OpCode.EnterBlockScope)
    block.statements.forEach(visitor)
    op.push(OpCode.ExitBlockScope)
  }

  function visitNumericLiteral(node: ts.NumericLiteral) {
    op.push(OpCode.Const)
    value.push({ value: +node.text })
    op.push({ value: value.length - 1 })
  }

  function visitIdentifier(id: ts.Identifier) {
    op.push(OpCode.Push)
    op.push({ value: id.text })
    op.push(OpCode.Load)
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
    op.push(OpCode.Push)
    op.push({ value: (variable.name as ts.Identifier).text })

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
        visitAssignmentExpression(<ts.AssignmentExpression<ts.AssignmentOperatorToken>>binary)
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
        op.push(OpCode.Set)
        break
      }
      case ts.SyntaxKind.PlusEqualsToken:
        {
          visitor(expr.right)
          visitor(expr.left)
          op.push(OpCode.Add)
          visitLeftHandSideExpression(expr.left)
          op.push(OpCode.Set)
        }
        break
      default:
        throw new Error('not supported')
    }
  }

  function visitWhileStatement(stmt: ts.WhileStatement) {
    const label1: Value = { value: 0 }
    const label2: Value = { value: 0 }

    label2.value = op.length
    visitor(stmt.expression)
    op.push(OpCode.JumpIfFalse)
    op.push(label1)

    visitor(stmt.statement)

    op.push(OpCode.Jump)
    op.push(label2)
    label1.value = op.length
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
        op.push(OpCode.Push)
        op.push({ value: (<ts.Identifier>lhs).text })
        break
      default:
        throw new Error('not supported')
    }
  }

  function visitConditionalExpression(cond: ts.ConditionalExpression) {
    const label1: Value = { value: 0 }
    const label2: Value = { value: 0 }

    visitor(cond.condition)

    op.push(OpCode.JumpIfFalse)
    op.push(label2)

    visitor(cond.whenTrue)
    op.push(OpCode.Jump)
    op.push(label1)
    label2.value = op.length

    visitor(cond.whenFalse)
    label1.value = op.length
  }
}
