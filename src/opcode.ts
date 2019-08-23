export enum OpCode {
  Eof,
  Const,
  Add,
  Sub,
  Mul,
  Div,

  LT,
  GT,

  Push,
  Def,
  DefBlock,
  Load,
  Set,

  Jump,
  JumpIfFalse,

  EnterBlockScope,
  ExitBlockScope
}
