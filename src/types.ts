import { OpCode, OpValue } from './opcode'
import { VObject, JSUndefined, JSFunction } from './value'

export interface VMDump {
  stack: VObject[]
  frames: StackFrame[]
  environments: Environment[]
  codes: (OpCode | OpValue)[]
  values: VObject[]
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

export interface BlockEnvironment {
  type: EnvironmentType.block
  valueTable: Map<string, VObject>
}

export type Environment =
  | LexerEnvironment
  | BlockEnvironment
  | GlobalEnvironment

export interface StackFrame {
  ret: number
  entry: number
  environments: LexerEnvironment | GlobalEnvironment
  thisObject: VObject | JSUndefined
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
