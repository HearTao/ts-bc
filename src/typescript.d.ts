import * as ts from 'typescript'

declare module 'typescript' {
  export interface FunctionDeclaration {
    locals: ts.SymbolTable
  }

  export interface MethodDeclaration {
    locals: ts.SymbolTable
  }

  export interface GetAccessorDeclaration {
    locals: ts.SymbolTable
  }

  export interface SetAccessorDeclaration {
    locals: ts.SymbolTable
  }

  export interface ConstructorDeclaration {
    locals: ts.SymbolTable
  }

  export interface FunctionExpression {
    locals: ts.SymbolTable
  }

  export interface ArrowFunction {
    locals: ts.SymbolTable
  }
}
