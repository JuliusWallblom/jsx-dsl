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

// Handle tokenization
test('tokenizes ~ as HANDLE token', () => {
  const tokens = tokenize('~focus');

  assert.strictEqual(tokens[0].type, 'HANDLE');
  assert.strictEqual(tokens[1].type, 'IDENTIFIER');
  assert.strictEqual(tokens[1].value, 'focus');
});

// Handle parsing
test('parses ~name = arrowFn as handle declaration', () => {
  const tokens = tokenize('~focus = () => doSomething');
  const ast = parse(tokens);

  assert.strictEqual(ast.handles.length, 1);
  assert.strictEqual(ast.handles[0].name, 'focus');
  assert.strictEqual(ast.handles[0].value.type, 'ArrowFunction');
});

// Callback tokenization
test('tokenizes ^ as CALLBACK token', () => {
  const tokens = tokenize('^handler');

  assert.strictEqual(tokens[0].type, 'CALLBACK');
  assert.strictEqual(tokens[1].type, 'IDENTIFIER');
  assert.strictEqual(tokens[1].value, 'handler');
});

// Callback parsing
test('parses ^name = arrowFn as callback declaration', () => {
  const tokens = tokenize('^handler = () => doSomething');
  const ast = parse(tokens);

  assert.strictEqual(ast.callbacks.length, 1);
  assert.strictEqual(ast.callbacks[0].name, 'handler');
  assert.strictEqual(ast.callbacks[0].value.type, 'ArrowFunction');
});

// Context tokenization
test('tokenizes & as CONTEXT token', () => {
  const tokens = tokenize('&theme');

  assert.strictEqual(tokens[0].type, 'CONTEXT');
  assert.strictEqual(tokens[1].type, 'IDENTIFIER');
  assert.strictEqual(tokens[1].value, 'theme');
});

// Context parsing
test('parses &contextName as context consumption', () => {
  const tokens = tokenize('&theme');
  const ast = parse(tokens);

  assert.strictEqual(ast.contexts.length, 1);
  assert.strictEqual(ast.contexts[0].name, 'theme');
  assert.strictEqual(ast.contexts[0].type, null);
});

test('parses &contextName::Type with type annotation', () => {
  const tokens = tokenize('&theme::ThemeType');
  const ast = parse(tokens);

  assert.strictEqual(ast.contexts.length, 1);
  assert.strictEqual(ast.contexts[0].name, 'theme');
  assert.strictEqual(ast.contexts[0].type.type, 'SimpleType');
  assert.strictEqual(ast.contexts[0].type.name, 'ThemeType');
});

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

// Code generation for useCallback
test('generates useCallback hook for cached functions', () => {
  const code = compile(`
@count = 0
^handler = () => count + 1
<div>{count}</div>
`);

  assert.ok(code.includes('useCallback'), 'should import useCallback');
  assert.ok(code.includes('const handler = useCallback('), 'should generate useCallback call');
  assert.ok(code.includes('[count]'), 'should include dependency array');
});

// Code generation for useContext
test('generates useContext hook for context consumption', () => {
  const code = compile(`
&theme
<div>{theme}</div>
`);

  assert.ok(code.includes('useContext'), 'should import useContext');
  assert.ok(code.includes('const theme = useContext('), 'should generate useContext call');
});

test('generates import statement for context object', () => {
  const code = compile(`
&theme
<div>{theme}</div>
`);

  assert.ok(code.includes("import { ThemeContext } from './ThemeContext'"), 'should import context object');
});

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

// Transition modifier parsing
test('parses @name:transition as transition declaration', () => {
  const tokens = tokenize('@submit:transition');
  const ast = parse(tokens);

  assert.strictEqual(ast.transitions.length, 1);
  assert.strictEqual(ast.transitions[0].name, 'submit');
});

// Code generation for useTransition
test('generates useTransition hook with proper naming', () => {
  const code = compile(`
@submit:transition
<div>content</div>
`);

  assert.ok(code.includes('useTransition'), 'should import useTransition');
  assert.ok(code.includes('isPendingSubmit'), 'should generate isPending flag with capitalized name');
  assert.ok(code.includes('startSubmitTransition'), 'should generate startTransition function with naming convention');
});

// Code generation for useImperativeHandle
test('generates forwardRef and useImperativeHandle for handle declarations', () => {
  const code = compile(`
~focus = () => doSomething
<div>content</div>
`);

  assert.ok(code.includes('forwardRef'), 'should import forwardRef');
  assert.ok(code.includes('useImperativeHandle'), 'should import useImperativeHandle');
  assert.ok(code.includes('forwardRef('), 'should wrap component with forwardRef');
  assert.ok(code.includes(', ref)'), 'should include ref parameter');
  assert.ok(code.includes('useImperativeHandle(ref'), 'should generate useImperativeHandle call');
  assert.ok(code.includes('focus:'), 'should include handle method in exposed object');
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
