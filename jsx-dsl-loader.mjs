// ESM wrapper for jsx-dsl-loader.js for testing purposes
import path from 'path';

/**
 * Get file information from a DSL resource path
 */
export function getLoaderFileInfo(resourcePath) {
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
