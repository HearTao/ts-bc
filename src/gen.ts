import * as ts from 'typescript'
import { OpCode } from './opcode';
import { Value } from './value';

export function gen(code: string): [(OpCode | Value)[], Value[]] {
    const op: (OpCode | Value)[] = [OpCode.Eof]
    const value: Value[] = []

    ts.forEachChild(ts.createSourceFile('', code, ts.ScriptTarget.Latest), visitor)

    return [op, value]

    function visitor (node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.NumericLiteral:
                value.push({ value: +(<ts.NumericLiteral>node).text})
                op.push({ value: value.length - 1 })
                op.push(OpCode.Load)
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
            // case ts.SyntaxKind.IfStatement:
            default:
                ts.forEachChild(node, visitor)
        }
    }

    function visitBinaryExpression(binary: ts.BinaryExpression) {
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

        visitor(binary.right)
        visitor(binary.left)
    }

    function visitConditionalExpression(cond: ts.ConditionalExpression) {
        const label1 = op.length - 1
        visitor(cond.whenFalse)
        const label2 = op.length - 1
        
        op.push({ value: label1 })
        op.push(OpCode.Jump)

        visitor(cond.whenTrue)
        op.push({ value: label2 })
        op.push(OpCode.JumpIfFalse)
        visitor(cond.condition)
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
