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
  Call
}
