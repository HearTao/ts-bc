export enum OpCode {
  Eof,
  Const,
  Add,
  Sub,
  Mul,
  Div,

  LT,
  GT,
  StrictEQ,
  StrictNEQ,

  Push,
  Def,
  DefBlock,
  Load,
  Set,

  Jump,
  JumpIfFalse,

  EnterBlockScope,
  ExitBlockScope,

  Ret,
  Call,

  Null,
  Undefined,

  CreateArray,
  CreateFunction,
  CreateObject,

  PropAccess,
  PropAssignment
}

export interface OpValue {
  value: number
}

export interface Label extends OpValue {}
