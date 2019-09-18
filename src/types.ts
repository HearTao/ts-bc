import * as ts from 'typescript'
import { OpCode, OpValue } from './opcode'
import {
  VObject,
  JSUndefined,
  JSFunction,
  ConstantValue,
  GeneratorContext
} from './value'

export interface VMDump {
  stack: VObject[]
  frames: StackFrame[]
  environments: Environment[]
  codes: (OpCode | OpValue)[]
  constants: ConstantValue[]
  cur: number
}

export interface DoneResult {
  finished: true
  value: VObject
}

export interface StepResult {
  finished: false
}

export type ExecResult = DoneResult | StepResult

export enum EnvironmentType {
  lexer,
  block,
  global
}

export interface GlobalEnvironment {
  type: EnvironmentType.global
  valueTable: Map<string, VObject>
}

export interface LexerEnvironment {
  type: EnvironmentType.lexer
  valueTable: Map<string, VObject>
  upValue: Map<string, VObject>
}

export enum BlockEnvironmentKind {
  normal,
  labeled,
  iterable,
  try
}

export interface BaseBlockEnvironment {
  type: EnvironmentType.block
  kind: BlockEnvironmentKind
  valueTable: Map<string, VObject>
}

export interface NormalBlockEnvironment extends BaseBlockEnvironment {
  kind: BlockEnvironmentKind.normal
}

export interface LabeledBlockEnvironment extends BaseBlockEnvironment {
  kind: BlockEnvironmentKind.labeled
  label: string
  end: number
}

export interface IterableBlockEnviroment extends BaseBlockEnvironment {
  kind: BlockEnvironmentKind.iterable
  end: number
}

export interface TryBlockEnviroment extends BaseBlockEnvironment {
  kind: BlockEnvironmentKind.try
  catchPos: number
}

export type BlockEnvironment =
  | NormalBlockEnvironment
  | LabeledBlockEnvironment
  | IterableBlockEnviroment
  | TryBlockEnviroment

export type Environment =
  | LexerEnvironment
  | BlockEnvironment
  | GlobalEnvironment

export interface StackFrame {
  ret: number
  entry: number
  environments: LexerEnvironment | GlobalEnvironment
  thisObject: VObject | JSUndefined
  generatorContext: GeneratorContext | undefined
}

export class JSPropertyDescriptor {
  constructor(
    public value?: VObject,
    public enumerable: boolean = true,
    public writable: boolean = true,
    public getter?: JSFunction,
    public setter?: JSFunction
  ) {}
}

export enum ObjectMemberType {
  property,
  getter,
  setter
}

export interface Callable {
  call(callee: JSFunction, args: VObject[], thisObject: VObject): void

  gc(): number
}

export interface LexerContext {
  func: ts.FunctionLikeDeclaration
  upValue: Set<string>
  locals: ts.SymbolTable[]
}

export class HeapEntry {
  public ref: number = 0

  constructor(
    public value: string | Array<any> | Map<string | number, VObject>
  ) {}
}
