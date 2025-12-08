// Vite plugin for JSX DSL (.jsx.dsl and .tsx.dsl files)
import path from 'path';
import { transform as esbuildTransform } from 'esbuild';
import { tokenize } from './src/tokenizer-ts.js';
import { parse } from './src/parser-ts.js';
import { generateTypeScript } from './src/generator-ts.js';
import { generate } from './src/generator.js';

const DSL_FILE_REGEX = /\.(jsx|tsx)\.dsl($|\?)/;

/**
 * Check if a file path is a DSL file (.jsx.dsl or .tsx.dsl)
 */
export function isDslFile(filePath) {
  return DSL_FILE_REGEX.test(filePath);
}

/**
 * Determine if a file should be compiled as TypeScript based on extension
 */
export function isTsxDslFile(filePath) {
  return filePath.endsWith('.tsx.dsl');
}

/**
 * Get the appropriate output extension based on file type and options
 */
export function getOutputExtension(filePath, useTypescript) {
  if (filePath.endsWith('.tsx.dsl')) {
    return '.tsx';
  }
  return useTypescript ? '.tsx' : '.jsx';
}

/**
 * Get the DSL extension from a file path
 */
export function getDslExtension(filePath) {
  if (filePath.endsWith('.tsx.dsl')) return '.tsx.dsl';
  if (filePath.endsWith('.jsx.dsl')) return '.jsx.dsl';
  return null;
}

/**
 * Vite plugin for JSX DSL
 * @param {Object} options - Plugin options
 * @param {boolean} options.typescript - Generate TypeScript output for .jsx.dsl files (default: true). Note: .tsx.dsl files always generate TypeScript.
 * @param {boolean} options.sourceMap - Generate source maps (default: true)
 * @param {boolean} options.hmr - Enable hot module replacement (default: true)
 * @param {RegExp} options.include - Include pattern (default: /\.(jsx|tsx)\.dsl$/)
 * @param {RegExp} options.exclude - Exclude pattern
 * @returns {import('vite').Plugin} Vite plugin
 */
export default function jsxDslPlugin(options = {}) {
  const {
    typescript = true,
    sourceMap = true,
    hmr = true,
    include = DSL_FILE_REGEX,
    exclude
  } = options;

  let isProduction = false;

  return {
    name: 'vite-plugin-jsx-dsl',
    enforce: 'pre', // Run before other plugins (especially React)

    configResolved(config) {
      isProduction = config.command === 'build';
    },

    // Handle .jsx.dsl and .tsx.dsl file resolution
    resolveId(id, importer) {
      if (isDslFile(id)) {
        return path.resolve(path.dirname(importer || ''), id);
      }
    },

    // Transform .jsx.dsl and .tsx.dsl files
    async transform(code, id) {
      // Check if this is a DSL file
      if (!isDslFile(id)) return;

      // Apply include/exclude filters
      if (include && !include.test(id)) return;
      if (exclude && exclude.test(id)) return;

      try {
        // Parse the DSL file
        const tokens = tokenize(code);
        const ast = parse(tokens);

        // Detect TypeScript mode: .tsx.dsl always uses TypeScript, .jsx.dsl uses the typescript option
        const useTypeScript = isTsxDslFile(id) || typescript;
        const dslExtension = getDslExtension(id);
        const outputExtension = getOutputExtension(id, typescript);

        // Generate the component name from file path
        const componentName = path.basename(id, dslExtension)
          .replace(/^\w/, c => c.toUpperCase())
          .replace(/-(\w)/g, (_, c) => c.toUpperCase())
          .replace(/[^a-zA-Z0-9]/g, '');

        let output;
        let map = null;

        if (useTypeScript) {
          // Generate TypeScript
          const result = generateTypeScript(ast, id, {
            componentName,
            generateSourceMap: sourceMap,
            outputFile: id.replace(dslExtension, outputExtension)
          });
          output = result.code;
          map = result.map;
        } else {
          // Generate JavaScript
          output = generate(ast);
        }

        // Add HMR support in development
        if (hmr && !isProduction) {
          output += `\n\n// HMR for JSX DSL
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // Force re-render when .jsx.dsl file changes
    if (newModule) {
      import.meta.hot.invalidate();
    }
  });
}`;
        }

        // IMPORTANT: Transform the JSX/TSX to JS using esbuild
        // Since we generated TSX/JSX code, we need to transform it to JS
        const transformed = await esbuildTransform(output, {
          loader: useTypeScript ? 'tsx' : 'jsx',
          target: 'esnext',
          jsx: 'automatic',
          jsxDev: !isProduction,
          sourcemap: sourceMap ? 'external' : false,
          sourcefile: id,
        });

        return {
          code: transformed.code,
          map: transformed.map || null
        };
      } catch (error) {
        // Provide helpful error messages
        console.error(`JSX DSL compilation error in ${id}:`, error.message);

        // Throw a simple error to avoid Vite's complex error handling
        throw new Error(`JSX DSL compilation failed: ${error.message}`);
      }
    },

    // Handle HMR updates
    handleHotUpdate(ctx) {
      if (isDslFile(ctx.file)) {
        // Force update all modules that import this DSL file
        const affectedModules = new Set();

        // Find all modules that import this DSL file
        for (const mod of ctx.server.moduleGraph.getModulesByFile(ctx.file) || []) {
          affectedModules.add(mod);

          // Also invalidate modules that import this module
          for (const importer of mod.importers) {
            affectedModules.add(importer);
          }
        }

        return [...affectedModules];
      }
    },

    // Configure dev server
    configureServer(server) {
      // Middleware to handle DSL file requests
      server.middlewares.use((req, res, next) => {
        if (req.url && isDslFile(req.url)) {
          // Set appropriate headers for DSL files
          res.setHeader('Content-Type', 'application/javascript');
        }
        next();
      });
    },

    // Build hooks
    buildStart() {
      // Log that the plugin is active
      this.info('JSX DSL plugin active - compiling .jsx.dsl and .tsx.dsl files');
    },

    // Generate bundle
    generateBundle(options, bundle) {
      // Post-process generated files if needed
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && isDslFile(chunk.facadeModuleId || '')) {
          // Add metadata about the original DSL file
          chunk.jsxDslOriginal = chunk.facadeModuleId;
        }
      }
    }
  };
}

// Named export for better tree-shaking
export { jsxDslPlugin };

// CommonJS compatibility
jsxDslPlugin.default = jsxDslPlugin;
