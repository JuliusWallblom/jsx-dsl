// Runtime compiler for Fast DSL
// This allows using .jsx.dsl syntax directly in JavaScript
// Note: For production, use build-time compilation instead

import React from 'react';
import { tokenize } from './tokenizer-ts.js';
import { parse } from './parser-ts.js';
import { generate } from './generator.js';

/**
 * Compile JSX DSL string to React component at runtime
 * @param {string} source - JSX DSL source code
 * @param {string} name - Component name (optional)
 * @returns {React.Component} - Compiled React component
 */
export function compile(source, name = 'Component') {
  try {
    // Parse JSX DSL syntax
    const tokens = tokenize(source);
    const ast = parse(tokens);

    // Generate JavaScript code
    const code = generate(ast);

    // Create component function from generated code
    // This uses eval which is not recommended for production
    const componentFactory = new Function('React', `
      const { useState, useEffect, useMemo } = React;
      ${code}
      return ${name};
    `);

    return componentFactory(React);
  } catch (error) {
    console.error('JSX DSL compilation error:', error);
    throw error;
  }
}

/**
 * React hook for using JSX DSL syntax inline
 * @param {string} source - JSX DSL source code
 * @returns {React.Component} - Compiled React component
 */
export function useJsxDsl(source) {
  const [Component, setComponent] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    try {
      const compiled = compile(source);
      setComponent(() => compiled);
      setError(null);
    } catch (err) {
      setError(err);
      setComponent(null);
    }
  }, [source]);

  if (error) {
    return () => React.createElement('div', {
      style: { color: 'red' }
    }, `JSX DSL Error: ${error.message}`);
  }

  return Component || (() => null);
}

/**
 * Template tag for JSX DSL syntax with syntax highlighting
 * @example
 * const Counter = jsxDsl`
 *   @count = 0
 *   !click = count++
 *   <btn @click=click>{count}</btn>
 * `;
 */
export function jsxDsl(strings, ...values) {
  const source = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '');
  }, '');

  return compile(source);
}

// Export for use in browser console or development
if (typeof window !== 'undefined') {
  window.JsxDsl = { compile, useJsxDsl, jsxDsl };
}