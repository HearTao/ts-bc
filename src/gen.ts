import * as ts from 'typescript'
import { OpCode } from './opcode';
import { Value } from './value';

export function gen(code: string): [OpCode[], Value[]] {
    const op: OpCode[] = [OpCode.Eof]
    const value: Value[] = []

    ts.forEachChild(ts.createSourceFile('', code, ts.ScriptTarget.Latest), visitor)

    return [op, value]

    function visitor (node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.NumericLiteral:
                op.push(OpCode.Push)
                value.push({ value: +(<ts.NumericLiteral>node).text})
                break;
            case ts.SyntaxKind.BinaryExpression:
                const binary = node as ts.BinaryExpression

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
                    default:
                        throw new Error('not supported')
                }

                visitor(binary.right)
                visitor(binary.left)
                break;
            case ts.SyntaxKind.ParenthesizedExpression:
                visitor((<ts.ParenthesizedExpression>node).expression)
                break;
            default:
                ts.forEachChild(node, visitor)
        }
    }

}
