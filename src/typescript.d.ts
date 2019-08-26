import * as ts from 'typescript'

declare module 'typescript' {
  export interface FunctionDeclaration {
    locals: ts.SymbolTable
  }
}
