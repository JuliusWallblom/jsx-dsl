export function generate(ast) {
  const lines = [];

  // Component name (derived from filename or default)
  const componentName = 'Component';

  // Generate imports
  lines.push(`import React, { useState, useEffect, useMemo } from 'react';`);
  lines.push('');

  // Start component function
  const propsParam = ast.props.length > 0
    ? `{ ${ast.props.join(', ')} }`
    : '';
  lines.push(`function ${componentName}(${propsParam}) {`);

  // Generate state declarations
  for (const state of ast.states) {
    const initialValue = expressionToJS(state.initialValue);
    lines.push(`  const [${state.name}, set${capitalize(state.name)}] = useState(${initialValue});`);
  }
  if (ast.states.length > 0) lines.push('');

  // Generate memo declarations
  for (const memo of ast.memos) {
    const value = expressionToJS(memo.value);
    const deps = extractDependencies(memo.value);
    lines.push(`  const ${memo.name} = useMemo(() => ${value}, [${deps.join(', ')}]);`);
  }
  if (ast.memos.length > 0) lines.push('');

  // Generate effects
  for (const effect of ast.effects) {
    const deps = effect.args.map(arg => expressionToJS(arg));
    if (effect.functionName === 'log') {
      lines.push(`  useEffect(() => {`);
      lines.push(`    console.log(${deps.join(', ')});`);
      lines.push(`  }, [${deps.join(', ')}]);`);
    } else {
      // Generic function call
      lines.push(`  useEffect(() => {`);
      lines.push(`    ${effect.functionName}(${deps.join(', ')});`);
      lines.push(`  }, [${deps.join(', ')}]);`);
    }
  }
  if (ast.effects.length > 0) lines.push('');

  // Generate event handlers from ast.events
  for (const [eventName, handler] of Object.entries(ast.events)) {
    const handlerCode = generateEventHandler(handler, ast.states);
    lines.push(`  const ${eventName} = ${handlerCode};`);
  }
  if (Object.keys(ast.events).length > 0) lines.push('');

  // Generate return statement with JSX
  lines.push('  return (');
  const jsxCode = generateJSX(ast.jsx, ast.events, 4);
  lines.push(jsxCode);
  lines.push('  );');

  // Close component function
  lines.push('}');
  lines.push('');
  lines.push(`export default ${componentName};`);

  return lines.join('\n');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
    'li': 'li'
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
      // Special handling for value attribute
      return `value={${expressionToJS(attr.value)}}`;
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

  // Replace item references in the template
  const itemizedTemplate = template.replace(
    new RegExp(`{${loop.item}}`, 'g'),
    '{item}'
  );

  return `${spaces}{${loop.list}.map((item, index) => (\n${spaces}  ${itemizedTemplate}\n${spaces}))}`;
}