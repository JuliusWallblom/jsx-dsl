// Webpack loader for .jsx.dsl files
const { tokenize } = require('./src/tokenizer-extended.js');
const { parse } = require('./src/parser-extended.js');
const { generateTypeScript } = require('./src/generator-ts.js');
const { generate } = require('./src/generator.js');

module.exports = function fstLoader(source) {
  const callback = this.async();

  try {
    // Tokenize and parse the .jsx.dsl source
    const tokens = tokenize(source);
    const ast = parse(tokens);

    // Generate JavaScript or TypeScript based on config
    const useTypeScript = this.query?.typescript || false;

    if (useTypeScript) {
      const { code } = generateTypeScript(ast, this.resourcePath, {
        componentName: path.basename(this.resourcePath, '.jsx.dsl'),
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