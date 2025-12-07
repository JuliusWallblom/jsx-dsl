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

// Layout effect tokenization
test('tokenizes $$ as LAYOUT_EFFECT token', () => {
  const tokens = tokenize('$$measure(el)');

  assert.strictEqual(tokens[0].type, 'LAYOUT_EFFECT');
  assert.strictEqual(tokens[1].type, 'IDENTIFIER');
  assert.strictEqual(tokens[1].value, 'measure');
});

test('tokenizes single $ as EFFECT token (not LAYOUT_EFFECT)', () => {
  const tokens = tokenize('$log(x)');

  assert.strictEqual(tokens[0].type, 'EFFECT');
  assert.strictEqual(tokens[1].type, 'IDENTIFIER');
  assert.strictEqual(tokens[1].value, 'log');
});

// Layout effect parsing
test('parses $$functionName(args) as layout effect declaration', () => {
  const tokens = tokenize('$$measure(element)');
  const ast = parse(tokens);

  assert.strictEqual(ast.layoutEffects.length, 1);
  assert.strictEqual(ast.layoutEffects[0].functionName, 'measure');
  assert.strictEqual(ast.layoutEffects[0].args.length, 1);
});

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

// Ref tokenization
test('tokenizes # as REF token', () => {
  const tokens = tokenize('#inputRef');

  assert.strictEqual(tokens[0].type, 'REF');
  assert.strictEqual(tokens[1].type, 'IDENTIFIER');
  assert.strictEqual(tokens[1].value, 'inputRef');
});

// Ref parsing
test('parses #refName as ref declaration', () => {
  const tokens = tokenize('#inputRef');
  const ast = parse(tokens);

  assert.strictEqual(ast.refs.length, 1);
  assert.strictEqual(ast.refs[0].name, 'inputRef');
  assert.strictEqual(ast.refs[0].type, null);
  assert.strictEqual(ast.refs[0].initialValue, null);
});

test('parses #refName::Type with type annotation', () => {
  const tokens = tokenize('#inputRef::HTMLInputElement');
  const ast = parse(tokens);

  assert.strictEqual(ast.refs.length, 1);
  assert.strictEqual(ast.refs[0].name, 'inputRef');
  assert.strictEqual(ast.refs[0].type.type, 'SimpleType');
  assert.strictEqual(ast.refs[0].type.name, 'HTMLInputElement');
});

test('parses #refName = initialValue with initial value', () => {
  const tokens = tokenize('#count = 0');
  const ast = parse(tokens);

  assert.strictEqual(ast.refs.length, 1);
  assert.strictEqual(ast.refs[0].name, 'count');
  assert.strictEqual(ast.refs[0].initialValue.type, 'Literal');
  assert.strictEqual(ast.refs[0].initialValue.value, 0);
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

// Code generation for useRef
test('generates useRef hook for ref declarations', () => {
  const code = compile(`
#inputRef
<div>content</div>
`);

  assert.ok(code.includes('useRef'), 'should import useRef');
  assert.ok(code.includes('const inputRef = useRef(null)'), 'should generate useRef call with null default');
});

test('generates useRef with type annotation', () => {
  const code = compile(`
#inputRef::HTMLInputElement
<div>content</div>
`);

  assert.ok(code.includes('useRef<HTMLInputElement>(null)'), 'should generate typed useRef');
});

test('generates useRef with initial value', () => {
  const code = compile(`
#count = 0
<div>content</div>
`);

  assert.ok(code.includes('const count = useRef(0)'), 'should generate useRef with initial value');
});

// Code generation for useImperativeHandle
test('generates forwardRef and useImperativeHandle for handle declarations', () => {
  const code = compile(`
~focus = () => doFocus
<div>content</div>
`);

  assert.ok(code.includes('forwardRef'), 'should import forwardRef');
  assert.ok(code.includes('useImperativeHandle'), 'should import useImperativeHandle');
  assert.ok(code.includes('forwardRef('), 'should wrap component with forwardRef');
  assert.ok(code.includes('useImperativeHandle(ref'), 'should generate useImperativeHandle call');
  assert.ok(code.includes('focus:'), 'should include focus method in handle object');
});

// Code generation for useLayoutEffect
test('generates useLayoutEffect hook for layout effect declarations', () => {
  const code = compile(`
$$measure(element)
<div>content</div>
`);

  assert.ok(code.includes('useLayoutEffect'), 'should import useLayoutEffect');
  assert.ok(code.includes('useLayoutEffect(() =>'), 'should generate useLayoutEffect call');
  assert.ok(code.includes('measure(element)'), 'should call the function with args');
});

// Deferred value modifier parsing
test('parses @name:deferred = value as deferred value declaration', () => {
  const tokens = tokenize('@deferredQuery:deferred = query');
  const ast = parse(tokens);

  assert.strictEqual(ast.deferredValues.length, 1);
  assert.strictEqual(ast.deferredValues[0].name, 'deferredQuery');
  assert.strictEqual(ast.deferredValues[0].sourceValue.type, 'Identifier');
  assert.strictEqual(ast.deferredValues[0].sourceValue.name, 'query');
});

// Code generation for useDeferredValue
test('generates useDeferredValue hook for deferred value declarations', () => {
  const code = compile(`
@query = ""
@deferredQuery:deferred = query
<div>{deferredQuery}</div>
`);

  assert.ok(code.includes('useDeferredValue'), 'should import useDeferredValue');
  assert.ok(code.includes('const deferredQuery = useDeferredValue(query)'), 'should generate useDeferredValue call');
});

// Optimistic modifier parsing
test('parses @name:optimistic = {state, updateFn} as optimistic declaration', () => {
  const tokens = tokenize('@optimisticTodos:optimistic = {todos, (state, newTodo) => state}');
  const ast = parse(tokens);

  assert.strictEqual(ast.optimistics.length, 1);
  assert.strictEqual(ast.optimistics[0].name, 'optimisticTodos');
  assert.strictEqual(ast.optimistics[0].state.type, 'Identifier');
  assert.strictEqual(ast.optimistics[0].state.name, 'todos');
  assert.strictEqual(ast.optimistics[0].updateFn.type, 'ArrowFunction');
});

// Code generation for useOptimistic
test('generates useOptimistic hook for optimistic declarations', () => {
  const code = compile(`
@todos = []
@optimisticTodos:optimistic = {todos, (state, newTodo) => state}
<div>content</div>
`);

  assert.ok(code.includes('useOptimistic'), 'should import useOptimistic');
  assert.ok(code.includes('const [optimisticTodos, addOptimisticTodos] = useOptimistic(todos'), 'should generate useOptimistic call');
});

// ID tokenization
test('tokenizes * as ID token', () => {
  const tokens = tokenize('*formId');

  assert.strictEqual(tokens[0].type, 'ID');
  assert.strictEqual(tokens[1].type, 'IDENTIFIER');
  assert.strictEqual(tokens[1].value, 'formId');
});

// ID parsing
test('parses *name as id declaration', () => {
  const tokens = tokenize('*formId');
  const ast = parse(tokens);

  assert.strictEqual(ast.ids.length, 1);
  assert.strictEqual(ast.ids[0].name, 'formId');
});

// Code generation for useId
test('generates useId hook for id declarations', () => {
  const code = compile(`
*formId
<div>content</div>
`);

  assert.ok(code.includes('useId'), 'should import useId');
  assert.ok(code.includes('const formId = useId()'), 'should generate useId call');
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
