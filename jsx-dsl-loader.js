// Webpack loader for .jsx.dsl and .tsx.dsl files
const path = require('path');
const { tokenize } = require('./src/tokenizer-ts.js');
const { parse } = require('./src/parser-ts.js');
const { generateTypeScript } = require('./src/generator-ts.js');
const { generate } = require('./src/generator.js');

/**
 * Get file information from a DSL resource path
 */
function getLoaderFileInfo(resourcePath) {
  const isTsxDsl = resourcePath.endsWith('.tsx.dsl');
  const isJsxDsl = resourcePath.endsWith('.jsx.dsl');
  const extension = isTsxDsl ? '.tsx.dsl' : isJsxDsl ? '.jsx.dsl' : null;

  const baseName = path.basename(resourcePath, extension);
  const componentName = baseName
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/-(\w)/g, (_, c) => c.toUpperCase());

  return {
    isTypeScript: isTsxDsl,
    componentName,
    extension
  };
}

module.exports = function jsxDslLoader(source) {
  const callback = this.async();

  try {
    // Tokenize and parse the DSL source
    const tokens = tokenize(source);
    const ast = parse(tokens);

    // Get file info to detect TypeScript mode
    const fileInfo = getLoaderFileInfo(this.resourcePath);

    // .tsx.dsl files always use TypeScript, .jsx.dsl uses the typescript query option
    const useTypeScript = fileInfo.isTypeScript || this.query?.typescript || false;

    if (useTypeScript) {
      const { code } = generateTypeScript(ast, this.resourcePath, {
        componentName: fileInfo.componentName,
        generateSourceMap: this.sourceMap
      });
      callback(null, code);
    } else {
      const code = generate(ast);
      callback(null, code);
    }
  } catch (error) {
    callback(error);
  }
};

// Export helper for testing
module.exports.getLoaderFileInfo = getLoaderFileInfo;
