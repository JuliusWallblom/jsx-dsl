// Babel plugin for inline .jsx.dsl transformation
module.exports = function babelPluginFst() {
  return {
    visitor: {
      ImportDeclaration(path, state) {
        // Transform import statements for .jsx.dsl files
        const source = path.node.source.value;

        if (source.endsWith('.jsx.dsl')) {
          // This would require the file to be pre-processed
          // Better to use webpack/vite loaders
          console.warn('.jsx.dsl imports should be handled by a bundler loader');
        }
      }
    }
  };
};