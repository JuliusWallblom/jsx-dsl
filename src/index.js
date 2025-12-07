// Main entry point for @faster/lang npm package

// Core compiler functions
export { tokenize } from './tokenizer-ts.js';
export { parse } from './parser-ts.js';
export { generate } from './generator.js';
export { generateTypeScript } from './generator-ts.js';

// Runtime compiler for development
export { compile, useFst, fst } from './runtime.js';

// Re-export token types for external tooling
export { TOKEN_TYPES } from './tokenizer-ts.js';

// Version info
export const VERSION = '1.1.0';

// Default export is the compile function for convenience
import { compile } from './runtime.js';
export default compile;