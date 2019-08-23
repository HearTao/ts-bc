import { Value } from './value'
import { OpCode } from './opcode'

export interface VMDump {
  stack: Value[]
  environments: Map<string, Value>[]
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
