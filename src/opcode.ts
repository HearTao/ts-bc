export enum OpCode {
  Const = 100,
  Add,
  Sub,
  Mul,
  Div,
  Pow,
  Mod,

  PrefixPlus,
  PrefixMinus,

  BitwiseNot,
  BitwiseAnd,
  BitwiseOr,
  BitwiseXor,
  RightArithmeticShift,
  LeftArithmeticShift,
  RightLogicalShift,

  LogicalNot,
  LogicalAnd,
  LogicalOr,

  LoadLeftValue,
  SetLeftValue,

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
  EnterLabeledBlockScope,
  EnterIterableBlockScope,
  ExitBlockScope,

  Break,
  BreakLabel,

  Ret,
  Call,
  CallMethod,

  CreateGeneratorContext,
  Yield,
  YieldStar,
  GeneratorReturn,

  Null,
  Undefined,
  False,
  True,
  Zero,
  One,

  CreateArray,
  CreateFunction,
  CreateGenerator,
  CreateLambda,
  CreateObject,

  This,
  New,

  PropAccess,

  ForInStart,
  ForInNext,
  ForOfStart,
  ForOfNext
}

export interface OpValue {
  value: number
}

export interface Label extends OpValue {}
