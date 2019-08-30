export enum OpCode {
  Eof,
  Const,
  Add,
  Sub,
  Mul,
  Div,

  LT,
  LTE,
  GT,
  GTE,
  StrictEQ,
  StrictNEQ,

  Push,

  Drop,
  Dup,
  Over,
  Swap,

  Def,
  DefBlock,
  Load,
  Set,

  Jump,
  JumpIfTrue,
  JumpIfFalse,

  EnterBlockScope,
  ExitBlockScope,

  Ret,
  Call,
  CallMethod,

  Null,
  Undefined,
  False,
  True,
  Zero,

  CreateArray,
  CreateFunction,
  CreateObject,

  This,
  New,

  PropAccess,
  PropAssignment,

  ForInStart,
  ForInNext,
  ForOfStart,
  ForOfNext
}

export interface OpValue {
  value: number
}

export interface Label extends OpValue {}
