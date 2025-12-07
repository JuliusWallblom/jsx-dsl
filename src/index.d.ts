import { FC } from 'react';

// Core compiler functions
export function tokenize(input: string): Token[];
export function parse(tokens: Token[]): AST;
export function generate(ast: AST): string;
export function generateTypeScript(ast: AST, sourceFile: string, options?: GenerateOptions): { code: string; map: string };

// Runtime compiler
export function compile(source: string, name?: string): FC<any>;
export function useJsxDsl(source: string): FC<any>;
export function jsxDsl(strings: TemplateStringsArray, ...values: any[]): FC<any>;

// Types
export const TOKEN_TYPES: Record<string, string>;
export const VERSION: string;

// Default export
export default compile;

// Internal types
interface Token {
  type: string;
  value?: any;
  line: number;
  column: number;
}

interface AST {
  props: PropDef[];
  states: StateDef[];
  effects: EffectDef[];
  memos: MemoDef[];
  events: Record<string, any>;
  jsx: JSXNode;
}

interface PropDef {
  name: string;
  type?: TypeDef;
}

interface StateDef {
  name: string;
  type?: TypeDef;
  initialValue: any;
}

interface EffectDef {
  functionName: string;
  args: any[];
}

interface MemoDef {
  name: string;
  type?: TypeDef;
  value: any;
}

interface TypeDef {
  type: string;
  name?: string;
  elementType?: string;
  types?: TypeDef[];
  typeParams?: TypeDef[];
}

interface JSXNode {
  type: string;
  tagName?: string;
  attributes?: any[];
  children?: JSXNode[];
  value?: string;
  expression?: any;
}

interface GenerateOptions {
  componentName?: string;
  generateSourceMap?: boolean;
  outputFile?: string;
}
