import * as ts from 'typescript'

declare module 'typescript' {
  export interface Node {
    locals?: ts.SymbolTable
  }

  export interface FunctionDeclaration extends Node {
    locals: ts.SymbolTable
  }

  export interface MethodDeclaration extends Node {
    locals: ts.SymbolTable
  }

  export interface GetAccessorDeclaration extends Node {
    locals: ts.SymbolTable
  }

  export interface SetAccessorDeclaration extends Node {
    locals: ts.SymbolTable
  }

  export interface ConstructorDeclaration extends Node {
    locals: ts.SymbolTable
  }

  export interface FunctionExpression extends Node {
    locals: ts.SymbolTable
  }

  export interface ArrowFunction extends Node {
    locals: ts.SymbolTable
  }
}
