import { Plugin } from 'vite';

export interface JsxDslPluginOptions {
  /** Generate TypeScript output (default: true) */
  typescript?: boolean;
  /** Generate source maps (default: true) */
  sourceMap?: boolean;
  /** Enable hot module replacement (default: true) */
  hmr?: boolean;
  /** Include pattern (default: /\.jsx\.dsl$/) */
  include?: RegExp;
  /** Exclude pattern */
  exclude?: RegExp;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Vite plugin for JSX DSL
 */
export default function jsxDslPlugin(options?: JsxDslPluginOptions): Plugin;
export { jsxDslPlugin };
