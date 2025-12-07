# Fast DSL

An ultra-minimal DSL that compiles to React code with state, effects, memoization, and more. Now with **TypeScript support**, **source maps**, and **VSCode integration**!

**File extension: `.jsx.dsl`**

## Installation

```bash
npm install
```

## Syntax Reference

### Symbols

| Symbol | Meaning | Example | React Equivalent |
|--------|---------|---------|-----------------|
| `@` | State | `@count = 0` | `const [count, setCount] = useState(0)` |
| `$` | Effect | `$log(count)` | `useEffect(() => { console.log(count) }, [count])` |
| `%` | Memoized value | `%sum = a + b` | `const sum = useMemo(() => a + b, [a, b])` |
| `:` | Prop | `:label` | Destructure `label` from props |
| `!` | Event handler | `!click = count++` | `onClick={() => setCount(count + 1)}` |
| `<>` | JSX tags | `<btn>{count}</btn>` | `<button>{count}</button>` |

## Usage

### CLI

```bash
# Compile to JavaScript
./fst input.jsx.dsl

# Compile to TypeScript with source maps
./fst input.jsx.dsl --typescript --sourcemap

# Watch mode with auto-recompilation
./fst input.jsx.dsl --watch

# Show compilation statistics
./fst input.jsx.dsl --stats

# Show examples
./fst examples
```

### VSCode Extension

1. Install the extension: `code --install-extension vscode-extension/fast-dsl-0.1.0.vsix`
2. Open any `.jsx.dsl` file
3. Enjoy syntax highlighting, auto-complete, and snippets
4. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux) to compile

## Examples

### Counter Component

```fst
:label
@count = 0
$log(count)
!click = count++
<btn @click=click>{label}: {count}</btn>
```

Compiles to:

```jsx
import React, { useState, useEffect, useMemo } from 'react';

function Component({ label }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log(count);
  }, [count]);

  const click = () => setCount(count + 1);

  return (
    <button onClick={click}>{label} {count}</button>
  );
}

export default Component;
```

### Todo List

```fst
@todos = []
@input = ""
!add = todos.push(input)

<div>
  <input />
  <btn @click=add>Add Todo</btn>
  <ul>
    <each item in todos>
      <li>{item}</li>
    </each>
  </ul>
</div>
```

### Advanced Example with Memoization

```fst
:title
@count = 0
@multiplier = 2
%result = count * multiplier
$log(result)
!inc = count++
!dec = count--
!double = multiplier += 1

<div>
  <h1>{title}</h1>
  <p>Count: {count}</p>
  <p>Multiplier: {multiplier}</p>
  <p>Result: {result}</p>
  <btn @click=inc>+</btn>
  <btn @click=dec>-</btn>
  <btn @click=double>Increase Multiplier</btn>
</div>
```

### TypeScript Example

```fst
:name::string
:age::number
@items::string[] = []
@input::string = ""
%count::number = items.length
!add = items.push(input)

<div>
  <h1>Hello {name}, age {age}</h1>
  <input val={input} />
  <btn @click=add>Add Item</btn>
  <p>Total items: {count}</p>
  <ul>
    <each item::string in items>
      <li>{item}</li>
    </each>
  </ul>
</div>
```

Compiles to fully-typed TypeScript React code with proper interfaces and type annotations.

## Features

- **Minimal syntax**: Write React components with 60-80% less code
- **Full React features**: useState, useEffect, useMemo support
- **TypeScript support**: Optional type annotations with `::` syntax
- **Source maps**: Debug your DSL code directly in the browser
- **VSCode integration**: Syntax highlighting, snippets, and IntelliSense
- **Event handlers**: Simple syntax for onClick and other events
- **List rendering**: `<each>` loops for iterating over arrays
- **Props support**: Declare component props with `:propName`
- **JSX compilation**: Compiles to clean, readable React or TypeScript code
- **Watch mode**: Auto-recompile on file changes
- **Fast compilation**: Instant feedback during development

## Tag Mappings

| DSL Tag | HTML Tag |
|---------|----------|
| `btn` | `button` |
| `input` | `input` |
| Others | Same as written |

## Scalability Considerations

This DSL is designed as a proof-of-concept for rapid prototyping. For production use, consider:

1. **Source maps**: Add source map generation for better debugging
2. **Type safety**: Integrate TypeScript support
3. **IDE support**: Create VSCode extension with syntax highlighting
4. **Module system**: Add import/export support
5. **Error handling**: Improve error messages with line/column info
6. **Testing**: Add unit tests for parser and generator

## How It Works

1. **Tokenizer**: Breaks input into tokens (symbols, identifiers, etc.)
2. **Parser**: Builds an Abstract Syntax Tree (AST)
3. **Generator**: Transforms AST into React JSX code

## Contributing

This is a proof-of-concept implementation. Feel free to experiment and extend!

## License

MIT