import assert from 'node:assert';
import { tokenize } from './tokenizer-ts.js';
import { parse } from './parser-ts.js';
import { generateTypeScript } from './generator-ts.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  ${e.message}`);
    failed++;
  }
}

// Arrow function parsing
test('parses arrow function expression: s => s + 1', () => {
  const result = parseExpr('s => s + 1');

  assert.strictEqual(result.type, 'ArrowFunction');
  assert.deepStrictEqual(result.params, ['s']);
  assert.strictEqual(result.body.type, 'BinaryOp');
  assert.strictEqual(result.body.operator, '+');
});

// Reducer modifier parsing
test('parses @name:reducer as reducer declaration', () => {
  const tokens = tokenize('@count:reducer = 0');
  const ast = parse(tokens);

  assert.strictEqual(ast.reducers.length, 1);
  assert.strictEqual(ast.reducers[0].name, 'count');
  assert.deepStrictEqual(ast.reducers[0].actions, []);
});

// Reducer object syntax: {initialValue, {actions}}
test('parses reducer with initial value and actions', () => {
  const tokens = tokenize('@count:reducer = {0, {increment: s => s + 1}}');
  const ast = parse(tokens);

  const reducer = ast.reducers[0];
  assert.strictEqual(reducer.name, 'count');
  assert.strictEqual(reducer.initialValue.type, 'Literal');
  assert.strictEqual(reducer.initialValue.value, 0);
  assert.strictEqual(reducer.actions.length, 1);
  assert.strictEqual(reducer.actions[0].name, 'increment');
  assert.strictEqual(reducer.actions[0].handler.type, 'ArrowFunction');
});

// Helper to parse an expression by wrapping in event syntax
function parseExpr(expr) {
  const tokens = tokenize(`!test = ${expr}`);
  const ast = parse(tokens);
  return ast.events.test;
}

// Helper to compile DSL to TypeScript
function compile(source) {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  const { code } = generateTypeScript(ast, 'test.dsl');
  return code;
}

// Code generation for useReducer
test('generates useReducer hook and reducer function', () => {
  const code = compile(`
@count:reducer = {0, {increment: s => s + 1}}
<div>{count}</div>
`);

  assert.ok(code.includes('useReducer'), 'should import useReducer');
  assert.ok(code.includes('countReducer'), 'should generate reducer function');
  assert.ok(code.includes('dispatchCount'), 'should generate dispatch with naming convention');
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
