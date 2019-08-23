import * as ts from 'typescript'
import { OpCode } from './opcode';
import { Value } from './value';

export function gen(code: string): [(OpCode | Value)[], Value[]] {
    const op: (OpCode | Value)[] = []
    const value: Value[] = []

    ts.forEachChild(ts.createSourceFile('', code, ts.ScriptTarget.Latest), visitor)

    return [op, value]

    function visitor (node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.NumericLiteral:
                visitNumericLiteral(<ts.NumericLiteral>node)
                break;
            case ts.SyntaxKind.BinaryExpression:
                visitBinaryExpression(<ts.BinaryExpression>node)
                break;
            case ts.SyntaxKind.ParenthesizedExpression:
                visitor((<ts.ParenthesizedExpression>node).expression)
                break;
            case ts.SyntaxKind.ConditionalExpression:
                visitConditionalExpression(<ts.ConditionalExpression>node)
                break;
            case ts.SyntaxKind.PrefixUnaryExpression:
                visitPrefixUnaryExpression(<ts.PrefixUnaryExpression>node)
                break;
            case ts.SyntaxKind.VariableDeclarationList:
                visitVariableDeclarationList(<ts.VariableDeclarationList>node)
                break
            case ts.SyntaxKind.VariableDeclaration:
                visitVariableDeclaration(<ts.VariableDeclaration>node)
                break;
            case ts.SyntaxKind.Identifier:
                visitIdentifier(<ts.Identifier>node)
            // case ts.SyntaxKind.IfStatement:
            default:
                ts.forEachChild(node, visitor)
        }
    }

    function visitNumericLiteral(node: ts.NumericLiteral) {
        op.push(OpCode.Const)
        value.push({ value: +node.text})
        op.push({ value: value.length - 1 })
    }

    function visitIdentifier(id: ts.Identifier) {
        op.push(OpCode.Push)
        op.push({ value: id.text })
        op.push(OpCode.Load)
    }

    function visitVariableDeclarationList(variables: ts.VariableDeclarationList) {
        if (variables.flags) {
            throw new Error('not supported')
        }
        variables.declarations.forEach(visitor)
    }

    function visitVariableDeclaration(variable: ts.VariableDeclaration) {
        if (!variable.initializer) {
            throw new Error('not supported')            
        }

        op.push(OpCode.Push)
        op.push({ value: (variable.name as ts.Identifier).text })
        visitor(variable.initializer)
        op.push(OpCode.Def)
    }

    function visitBinaryExpression(binary: ts.BinaryExpression) {
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
                break;
            case ts.SyntaxKind.SlashToken:
                op.push(OpCode.Div)
                break;
            default:
                throw new Error('not supported')
        }
    }

    function visitPrefixUnaryExpression(prefix: ts.PrefixUnaryExpression) {
        // SyntaxKind.PlusPlusToken | SyntaxKind.MinusMinusToken | SyntaxKind.PlusToken | SyntaxKind.MinusToken | SyntaxKind.TildeToken | SyntaxKind.ExclamationToken
        switch (prefix.operator) {
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
    // function visitIfStatement(stmt: ts.IfStatement) {
    //     if (stmt.elseStatement) {
    //         visitor(stmt.elseStatement)
    //     }
    //     const label1 = op.length - 1

    //     visitor(stmt.thenStatement)

    //     op.push(OpCode.JumpIfFalse)
    //     op.push({ value: label1 })
    //     visitor(stmt.expression)
    // }
}
