#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import chalk from 'chalk';
import { tokenize } from './tokenizer-ts.js';
import { parse } from './parser-ts.js';
import { generate } from './generator.js';
import { generateTypeScript } from './generator-ts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get file information from a DSL file path including extension detection,
 * component name derivation, and default output path.
 */
export function getFileInfo(filePath) {
  const isTsxDsl = filePath.endsWith('.tsx.dsl');
  const isJsxDsl = filePath.endsWith('.jsx.dsl');
  const extension = isTsxDsl ? '.tsx.dsl' : isJsxDsl ? '.jsx.dsl' : null;

  // Derive component name from file basename
  const baseName = extension ? basename(filePath, extension) : basename(filePath);
  const componentName = baseName
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/-(\w)/g, (_, c) => c.toUpperCase());

  // Derive default output path
  const outputExtension = isTsxDsl ? '.tsx' : '.jsx';
  const defaultOutput = extension
    ? filePath.replace(new RegExp(`\\${extension}$`), outputExtension)
    : filePath;

  return {
    isTypeScript: isTsxDsl,
    componentName,
    extension,
    defaultOutput
  };
}

function compile(inputFile, options) {
  try {
    // Read input file
    console.log(chalk.blue(`📖 Reading ${inputFile}...`));
    const input = readFileSync(inputFile, 'utf8');

    // Tokenize
    console.log(chalk.yellow('🔤 Tokenizing...'));
    const tokens = tokenize(input);

    // Parse
    console.log(chalk.yellow('🌳 Parsing...'));
    const ast = parse(tokens);

    // Get file information and detect TypeScript mode
    const fileInfo = getFileInfo(inputFile);
    const isTypeScript = options.typescript || fileInfo.isTypeScript || options.output?.endsWith('.tsx');
    const componentName = fileInfo.componentName;

    if (isTypeScript) {
      console.log(chalk.yellow('⚛️  Generating TypeScript React code...'));

      const outputFile = options.output || fileInfo.defaultOutput;
      const { code, map } = generateTypeScript(ast, inputFile, {
        outputFile,
        componentName,
        generateSourceMap: options.sourcemap
      });

      // Write output files
      console.log(chalk.blue(`✍️  Writing to ${outputFile}...`));
      writeFileSync(outputFile, code);

      if (options.sourcemap && map) {
        const mapFile = `${outputFile}.map`;
        console.log(chalk.blue(`🗺️  Writing source map to ${mapFile}...`));
        writeFileSync(mapFile, map);

        // Add source map reference to the generated file
        const codeWithMap = code + `\n//# sourceMappingURL=${basename(mapFile)}`;
        writeFileSync(outputFile, codeWithMap);
      }

      console.log(chalk.green(`✅ Successfully compiled ${inputFile} to ${outputFile}`));

      if (options.verbose) {
        console.log(chalk.gray('\n' + code));
      }

    } else {
      console.log(chalk.yellow('⚛️  Generating React code...'));

      const outputFile = options.output || fileInfo.defaultOutput;
      const reactCode = generate(ast);

      console.log(chalk.blue(`✍️  Writing to ${outputFile}...`));
      writeFileSync(outputFile, reactCode);

      console.log(chalk.green(`✅ Successfully compiled ${inputFile} to ${outputFile}`));

      if (options.verbose) {
        console.log(chalk.gray('\n' + reactCode));
      }
    }

    // Show stats if requested
    if (options.stats) {
      console.log(chalk.cyan('\n📊 Compilation Stats:'));
      console.log(chalk.cyan(`  • Props: ${ast.props.length}`));
      console.log(chalk.cyan(`  • States: ${ast.states.length}`));
      console.log(chalk.cyan(`  • Effects: ${ast.effects.length}`));
      console.log(chalk.cyan(`  • Memos: ${ast.memos.length}`));
      console.log(chalk.cyan(`  • Events: ${Object.keys(ast.events).length}`));
    }

  } catch (error) {
    console.error(chalk.red('❌ Compilation failed:'));
    console.error(chalk.red(error.message));

    if (options.debug) {
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}

async function watch(inputFile, options) {
  const fs = await import('fs');

  console.log(chalk.blue(`👁️  Watching ${inputFile} for changes...`));

  // Compile once immediately
  compile(inputFile, options);

  // Watch for changes
  fs.watchFile(inputFile, { interval: 500 }, () => {
    console.log(chalk.yellow(`\n🔄 File changed, recompiling...`));
    compile(inputFile, options);
  });
}

program
  .name('jsx-dsl')
  .description('Fast DSL Compiler with TypeScript and Source Map support')
  .version('2.0.0')
  .argument('<input>', 'Input DSL file (.jsx.dsl or .tsx.dsl)')
  .option('-o, --output <file>', 'Output file path')
  .option('-t, --typescript', 'Generate TypeScript (.tsx) output')
  .option('-s, --sourcemap', 'Generate source maps')
  .option('-w, --watch', 'Watch mode - recompile on file changes')
  .option('-v, --verbose', 'Show generated code in console')
  .option('--stats', 'Show compilation statistics')
  .option('--debug', 'Show debug information and stack traces')
  .action(async (inputFile, options) => {
    const input = resolve(inputFile);

    if (options.watch) {
      await watch(input, options);
    } else {
      compile(input, options);
    }
  });

// Add examples command
program
  .command('examples')
  .description('Show DSL syntax examples')
  .action(() => {
    console.log(chalk.cyan('\n📚 React Micro DSL Examples:\n'));

    console.log(chalk.yellow('Simple Counter:'));
    console.log(chalk.gray(`
:label
@count = 0
!click = count++
<btn @click=click>{label}: {count}</btn>
`));

    console.log(chalk.yellow('TypeScript Counter:'));
    console.log(chalk.gray(`
:label::string
@count::number = 0
!click = count++
<btn @click=click>{label}: {count}</btn>
`));

    console.log(chalk.yellow('Todo List with Types:'));
    console.log(chalk.gray(`
@todos::string[] = []
@input::string = ""
!add = todos.push(input)

<div>
  <input val={input} />
  <btn @click=add>Add</btn>
  <ul>
    <each item::string in todos>
      <li>{item}</li>
    </each>
  </ul>
</div>
`));
  });

// Only parse CLI args when running as main module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/cli.js')) {
  program.parse();
}
