import { SourceMapGenerator } from 'source-map';

export function generateTypeScript(ast, sourceFile, options = {}) {
  const lines = [];
  const sourceMap = new SourceMapGenerator({
    file: options.outputFile || 'output.tsx'
  });

  let currentLine = 1;
  let currentColumn = 0;

  const addLine = (content, originalLine = null) => {
    if (originalLine && sourceFile) {
      sourceMap.addMapping({
        generated: { line: currentLine, column: 0 },
        source: sourceFile,
        original: { line: originalLine, column: 0 }
      });
    }
    lines.push(content);
    currentLine++;
  };

  // Component name (derived from filename or default)
  const componentName = options.componentName || 'Component';

  // Generate imports - only import what we need
  const imports = ['React'];
  if (ast.states.length > 0) imports.push('useState');
  if (ast.reducers?.length > 0) imports.push('useReducer');
  if (ast.transitions?.length > 0) imports.push('useTransition');
  if (ast.contexts?.length > 0) imports.push('useContext');
  if (ast.callbacks?.length > 0) imports.push('useCallback');
  if (ast.refs?.length > 0) imports.push('useRef');
  if (ast.effects.length > 0) imports.push('useEffect');
  if (ast.memos.length > 0) imports.push('useMemo');

  const importList = imports.length > 1
    ? `React, { ${imports.slice(1).join(', ')} }`
    : 'React';

  addLine(`import ${importList} from 'react';`);

  // Generate imports for context objects
  for (const context of ast.contexts || []) {
    const contextObjectName = `${capitalize(context.name)}Context`;
    addLine(`import { ${contextObjectName} } from './${contextObjectName}';`);
  }

  addLine('');

  // Generate TypeScript interfaces for props
  if (ast.props.length > 0) {
    addLine(`interface ${componentName}Props {`);
    for (const prop of ast.props) {
      const typeStr = typeToTypeScript(prop.type) || 'any';
      addLine(`  ${prop.name}: ${typeStr};`);
    }
    addLine('}');
    addLine('');
  }

  // Generate reducer functions
  for (const reducer of ast.reducers || []) {
    const reducerName = `${reducer.name}Reducer`;
    addLine(`function ${reducerName}(state, action) {`);
    addLine(`  switch (action.type) {`);
    for (const action of reducer.actions) {
      const body = arrowFunctionBodyToJS(action.handler, 'state');
      addLine(`    case '${action.name}': return ${body};`);
    }
    addLine(`    default: return state;`);
    addLine(`  }`);
    addLine(`}`);
    addLine('');
  }

  // Start component function
  const propsParam = ast.props.length > 0
    ? `{ ${ast.props.map(p => p.name).join(', ')} }: ${componentName}Props`
    : '';
  addLine(`function ${componentName}(${propsParam}) {`);

  // Generate state declarations with types
  for (const state of ast.states) {
    const initialValue = expressionToJS(state.initialValue);
    const typeAnnotation = state.type ? `<${typeToTypeScript(state.type)}>` : '';
    addLine(`  const [${state.name}, set${capitalize(state.name)}] = useState${typeAnnotation}(${initialValue});`);
  }
  if (ast.states.length > 0) addLine('');

  // Generate useReducer hooks
  for (const reducer of ast.reducers || []) {
    const reducerName = `${reducer.name}Reducer`;
    const dispatchName = `dispatch${capitalize(reducer.name)}`;
    const initialValue = expressionToJS(reducer.initialValue);
    addLine(`  const [${reducer.name}, ${dispatchName}] = useReducer(${reducerName}, ${initialValue});`);
  }
  if (ast.reducers?.length > 0) addLine('');

  // Generate useTransition hooks
  for (const transition of ast.transitions || []) {
    const isPendingName = `isPending${capitalize(transition.name)}`;
    const startTransitionName = `start${capitalize(transition.name)}Transition`;
    addLine(`  const [${isPendingName}, ${startTransitionName}] = useTransition();`);
  }
  if (ast.transitions?.length > 0) addLine('');

  // Generate useContext hooks
  for (const context of ast.contexts || []) {
    const contextObjectName = `${capitalize(context.name)}Context`;
    addLine(`  const ${context.name} = useContext(${contextObjectName});`);
  }
  if (ast.contexts?.length > 0) addLine('');

  // Generate useCallback hooks
  for (const callback of ast.callbacks || []) {
    const fn = expressionToJS(callback.value);
    const allDeps = extractDependencies(callback.value.body);
    // Filter out arrow function parameters from dependencies
    const params = callback.value.params || [];
    const deps = allDeps.filter(dep => !params.includes(dep));
    addLine(`  const ${callback.name} = useCallback(${fn}, [${deps.join(', ')}]);`);
  }
  if (ast.callbacks?.length > 0) addLine('');

  // Generate useRef hooks
  for (const ref of ast.refs || []) {
    const initialValue = ref.initialValue ? expressionToJS(ref.initialValue) : 'null';
    const typeAnnotation = ref.type ? `<${typeToTypeScript(ref.type)}>` : '';
    addLine(`  const ${ref.name} = useRef${typeAnnotation}(${initialValue});`);
  }
  if (ast.refs?.length > 0) addLine('');

  // Generate memo declarations with types
  for (const memo of ast.memos) {
    const value = expressionToJS(memo.value);
    const deps = extractDependencies(memo.value);
    const typeAnnotation = memo.type ? `<${typeToTypeScript(memo.type)}>` : '';
    addLine(`  const ${memo.name} = useMemo${typeAnnotation}(() => ${value}, [${deps.join(', ')}]);`);
  }
  if (ast.memos.length > 0) addLine('');

  // Generate effects
  for (const effect of ast.effects) {
    const deps = effect.args.map(arg => expressionToJS(arg));
    if (effect.functionName === 'log') {
      addLine(`  useEffect(() => {`);
      addLine(`    console.log(${deps.join(', ')});`);
      addLine(`  }, [${deps.join(', ')}]);`);
    } else {
      // Generic function call
      addLine(`  useEffect(() => {`);
      addLine(`    ${effect.functionName}(${deps.join(', ')});`);
      addLine(`  }, [${deps.join(', ')}]);`);
    }
  }
  if (ast.effects.length > 0) addLine('');

  // Generate event handlers from ast.events
  for (const [eventName, handler] of Object.entries(ast.events)) {
    const handlerCode = generateEventHandler(handler, ast.states);
    addLine(`  const ${eventName} = ${handlerCode};`);
  }
  if (Object.keys(ast.events).length > 0) addLine('');

  // Generate return statement with JSX
  addLine('  return (');
  const jsxCode = generateJSX(ast.jsx, ast.events, 4);
  lines.push(jsxCode);
  addLine('  );');

  // Close component function
  addLine('}');
  addLine('');
  addLine(`export default ${componentName};`);

  const code = lines.join('\n');
  const map = sourceMap.toString();

  return { code, map };
}

function typeToTypeScript(type) {
  if (!type) return null;

  switch (type.type) {
    case 'SimpleType':
      // Map common types
      const typeMap = {
        'str': 'string',
        'num': 'number',
        'bool': 'boolean',
      };
      return typeMap[type.name] || type.name;
    case 'ArrayType':
      return `${typeToTypeScript({ type: 'SimpleType', name: type.elementType })}[]`;
    case 'UnionType':
      return type.types.map(typeToTypeScript).join(' | ');
    case 'GenericType':
      const params = type.typeParams.map(typeToTypeScript).join(', ');
      return `${type.name}<${params}>`;
    default:
      return 'any';
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function arrowFunctionBodyToJS(expr, paramReplacement = null) {
  if (expr.type === 'ArrowFunction') {
    const body = expr.body;
    if (paramReplacement && expr.params.length > 0) {
      const paramName = expr.params[0];
      return expressionToJSWithReplacement(body, paramName, paramReplacement);
    }
    return expressionToJS(body);
  }
  return expressionToJS(expr);
}

function expressionToJSWithReplacement(expr, from, to) {
  if (!expr) return 'undefined';
  if (expr.type === 'Identifier' && expr.name === from) {
    return to;
  }
  if (expr.type === 'BinaryOp') {
    const left = expressionToJSWithReplacement(expr.left, from, to);
    const right = expressionToJSWithReplacement(expr.right, from, to);
    return `${left} ${expr.operator} ${right}`;
  }
  return expressionToJS(expr);
}

function expressionToJS(expr) {
  if (!expr) return 'undefined';

  switch (expr.type) {
    case 'Literal':
      return String(expr.value);
    case 'Identifier':
      return expr.name;
    case 'Update':
      if (expr.operator === '++') {
        return `${expr.target} + 1`;
      }
      if (expr.operator === '--') {
        return `${expr.target} - 1`;
      }
      if (expr.operator === '+=' && expr.value) {
        return `${expr.target} + ${expressionToJS(expr.value)}`;
      }
      return expr.target;
    case 'BinaryOp':
      return `${expressionToJS(expr.left)} ${expr.operator} ${expressionToJS(expr.right)}`;
    case 'MethodCall':
      const args = expr.args.map(expressionToJS).join(', ');
      return `${expr.object}.${expr.method}(${args})`;
    case 'PropertyAccess':
      return `${expr.object}.${expr.property}`;
    case 'ArrowFunction':
      const arrowParams = expr.params.join(', ');
      const arrowBody = expressionToJS(expr.body);
      return `(${arrowParams}) => ${arrowBody}`;
    case 'Array':
      const elements = expr.elements.map(expressionToJS).join(', ');
      return `[${elements}]`;
    default:
      return 'null';
  }
}

function generateEventHandler(handler, states) {
  if (handler.type === 'Update') {
    const stateName = handler.target;
    const setter = `set${capitalize(stateName)}`;

    if (handler.operator === '++') {
      return `() => ${setter}(${stateName} + 1)`;
    }
    if (handler.operator === '--') {
      return `() => ${setter}(${stateName} - 1)`;
    }
    if (handler.operator === '+=' && handler.value) {
      const value = expressionToJS(handler.value);
      return `() => ${setter}(${stateName} + ${value})`;
    }
  }

  if (handler.type === 'MethodCall') {
    // For list operations like list.push(input)
    const args = handler.args.map(expressionToJS).join(', ');
    if (handler.method === 'push') {
      const setter = `set${capitalize(handler.object)}`;
      return `() => ${setter}([...${handler.object}, ${args}])`;
    }
  }

  // Generic handler
  const code = expressionToJS(handler);
  return `() => ${code}`;
}

function extractDependencies(expr) {
  const deps = [];

  function traverse(node) {
    if (!node) return;

    if (node.type === 'Identifier') {
      if (!deps.includes(node.name)) {
        deps.push(node.name);
      }
    } else if (node.type === 'BinaryOp') {
      traverse(node.left);
      traverse(node.right);
    } else if (node.type === 'MethodCall') {
      deps.push(node.object);
      node.args.forEach(traverse);
    }
  }

  traverse(expr);
  return deps;
}

function generateJSX(jsx, events, indent = 2) {
  const spaces = ' '.repeat(indent);

  if (!jsx) return `${spaces}<div />`;

  switch (jsx.type) {
    case 'JSXElement':
      return generateJSXElement(jsx, events, indent);
    case 'JSXFragment':
      const children = jsx.children.map(child => generateJSX(child, events, indent + 2)).join('\n');
      return `${spaces}<>\n${children}\n${spaces}</>`;
    case 'JSXExpression':
      return `{${expressionToJS(jsx.expression)}}`;
    case 'JSXText':
      return jsx.value;
    case 'EachLoop':
      return generateEachLoop(jsx, events, indent);
    default:
      return `${spaces}<div />`;
  }
}

function generateJSXElement(element, events, indent) {
  const spaces = ' '.repeat(indent);
  const { tagName, attributes, children } = element;

  // Map common tag names to HTML equivalents
  const htmlTagName = {
    'btn': 'button',
    'input': 'input',
    'p': 'p',
    'div': 'div',
    'span': 'span',
    'ul': 'ul',
    'li': 'li',
    'h1': 'h1',
    'h2': 'h2',
    'h3': 'h3'
  }[tagName] || tagName;

  // Generate attributes
  const attrs = attributes.map(attr => {
    if (attr.value.type === 'EventHandler') {
      // Map event names to React event handlers
      const eventMap = {
        'click': 'onClick',
        'change': 'onChange',
        'submit': 'onSubmit'
      };
      const reactEvent = eventMap[attr.name] || `on${capitalize(attr.name)}`;
      return `${reactEvent}={${attr.value.handler}}`;
    } else if (attr.name === 'val') {
      // Special handling for value attribute - need both value and onChange for two-way binding
      const valueExpr = expressionToJS(attr.value);
      // Assume the value is a state variable and add onChange handler
      if (attr.value.type === 'Identifier') {
        const setter = `set${capitalize(attr.value.name)}`;
        return `value={${valueExpr}} onChange={(e) => ${setter}(e.target.value)}`;
      }
      return `value={${valueExpr}}`;
    } else if (attr.name === 'on') {
      // Special handling for inline event handlers
      return `onChange={${expressionToJS(attr.value)}}`;
    } else {
      return `${attr.name}={${expressionToJS(attr.value)}}`;
    }
  });

  const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (children.length === 0) {
    return `${spaces}<${htmlTagName}${attrString} />`;
  }

  // Handle simple children - handle text followed by expression
  const hasOnlyTextAndExpr = children.every(child =>
    child.type === 'JSXText' || child.type === 'JSXExpression'
  );

  if (hasOnlyTextAndExpr) {
    const childContent = children.map(child =>
      child.type === 'JSXText'
        ? child.value
        : `{${expressionToJS(child.expression)}}`
    ).join(' ');
    return `${spaces}<${htmlTagName}${attrString}>${childContent}</${htmlTagName}>`;
  }

  // Handle complex children
  const childrenCode = children.map(child => {
    if (child.type === 'JSXText') {
      return `${spaces}  ${child.value}`;
    } else if (child.type === 'JSXExpression') {
      return `${spaces}  {${expressionToJS(child.expression)}}`;
    } else {
      return generateJSX(child, events, indent + 2);
    }
  }).join('\n');

  return `${spaces}<${htmlTagName}${attrString}>\n${childrenCode}\n${spaces}</${htmlTagName}>`;
}

function generateEachLoop(loop, events, indent) {
  const spaces = ' '.repeat(indent);
  const template = generateJSXElement(loop.template, events, 0).trim();

  // Add type annotation if available
  const itemType = loop.itemType ? `: ${typeToTypeScript(loop.itemType)}` : '';

  // Replace item references in the template
  const itemizedTemplate = template.replace(
    new RegExp(`{${loop.item}}`, 'g'),
    '{item}'
  );

  return `${spaces}{${loop.list}.map((item${itemType}, index) => (\n${spaces}  ${itemizedTemplate}\n${spaces}))}`;
}