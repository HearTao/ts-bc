import { Value } from './value'
import { OpCode } from './opcode'

export interface VMDump {
  stack: Value[]
  environments: Environment[]
  codes: (OpCode | Value)[]
  values: Value[]
  cur: number
}

export interface DoneResult {
  finished: true
  value: Value
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
  valueTable: Map<string, Value>
}

export interface LexerEnvironment {
  type: EnvironmentType.lexer
  valueTable: Map<string, Value>
}

export interface BlockEnvironment {
  type: EnvironmentType.block
  valueTable: Map<string, Value>
}

export type Environment =
  | LexerEnvironment
  | BlockEnvironment
  | GlobalEnvironment

export interface StackFrame {
  ret: number
  environments: LexerEnvironment | GlobalEnvironment
}
