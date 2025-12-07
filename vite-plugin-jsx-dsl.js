// Vite plugin for JSX DSL (.jsx.dsl files)
import path from 'path';
import { transform as esbuildTransform } from 'esbuild';
import { tokenize } from './src/tokenizer-ts.js';
import { parse } from './src/parser-ts.js';
import { generateTypeScript } from './src/generator-ts.js';
import { generate } from './src/generator.js';

const JSX_DSL_FILE_REGEX = /\.jsx\.dsl$/;

/**
 * Vite plugin for JSX DSL
 * @param {Object} options - Plugin options
 * @param {boolean} options.typescript - Generate TypeScript output (default: true)
 * @param {boolean} options.sourceMap - Generate source maps (default: true)
 * @param {boolean} options.hmr - Enable hot module replacement (default: true)
 * @param {string} options.include - Include pattern (default: /\.jsx\.dsl$/)
 * @param {string} options.exclude - Exclude pattern
 * @returns {import('vite').Plugin} Vite plugin
 */
export default function jsxDslPlugin(options = {}) {
  const {
    typescript = true,
    sourceMap = true,
    hmr = true,
    include = JSX_DSL_FILE_REGEX,
    exclude
  } = options;

  let isProduction = false;

  return {
    name: 'vite-plugin-jsx-dsl',
    enforce: 'pre', // Run before other plugins (especially React)

    configResolved(config) {
      isProduction = config.command === 'build';
    },

    // Handle .jsx.dsl file resolution
    resolveId(id, importer) {
      if (JSX_DSL_FILE_REGEX.test(id)) {
        return path.resolve(path.dirname(importer || ''), id);
      }
    },

    // Transform .jsx.dsl files
    async transform(code, id) {
      // Check if this is a .jsx.dsl file
      if (!JSX_DSL_FILE_REGEX.test(id)) return;

      // Apply include/exclude filters
      if (include && !include.test(id)) return;
      if (exclude && exclude.test(id)) return;

      try {
        // Parse the .jsx.dsl file
        const tokens = tokenize(code);
        const ast = parse(tokens);

        // Generate the component name from file path
        const componentName = path.basename(id, '.jsx.dsl')
          .replace(/^\w/, c => c.toUpperCase())
          .replace(/-(\w)/g, (_, c) => c.toUpperCase())
          .replace(/[^a-zA-Z0-9]/g, '');

        let output;
        let map = null;

        if (typescript) {
          // Generate TypeScript
          const result = generateTypeScript(ast, id, {
            componentName,
            generateSourceMap: sourceMap,
            outputFile: id.replace('.jsx.dsl', '.tsx')
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
          loader: typescript ? 'tsx' : 'jsx',
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
      if (JSX_DSL_FILE_REGEX.test(ctx.file)) {
        // Force update all modules that import this .jsx.dsl file
        const affectedModules = new Set();

        // Find all modules that import this .jsx.dsl file
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
      // Middleware to handle .jsx.dsl file requests
      server.middlewares.use((req, res, next) => {
        if (req.url && JSX_DSL_FILE_REGEX.test(req.url)) {
          // Set appropriate headers for .jsx.dsl files
          res.setHeader('Content-Type', 'application/javascript');
        }
        next();
      });
    },

    // Build hooks
    buildStart() {
      // Log that the plugin is active
      this.info('JSX DSL plugin active - compiling .jsx.dsl files');
    },

    // Generate bundle
    generateBundle(options, bundle) {
      // Post-process generated files if needed
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.facadeModuleId?.endsWith('.jsx.dsl')) {
          // Add metadata about the original .jsx.dsl file
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