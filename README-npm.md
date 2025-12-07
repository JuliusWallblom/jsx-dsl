# faster-lang

> Write React components with 70% less code. A minimal DSL that compiles to React with TypeScript support.

[![npm version](https://img.shields.io/npm/v/faster-lang.svg)](https://www.npmjs.com/package/faster-lang)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Faster?

Faster is a minimal DSL that compiles to React. Write components in `.jsx.dsl` files with ultra-compact syntax:

```fst
:name::string
@count = 0
!increment = count++

<div>
  <h1>Hello {name}!</h1>
  <btn @click=increment>Clicked {count} times</btn>
</div>
```

This compiles to full React with TypeScript, hooks, and all the features you need.

## Installation

```bash
npm install faster-lang
# or
yarn add faster-lang
# or
pnpm add faster-lang
```

## Quick Start

### 1. Configure Your Build Tool

#### Vite

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fst from 'faster-lang/vite';

export default defineConfig({
  plugins: [react(), fst()]
});
```

#### Webpack

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx\.dsl$/,
        use: 'faster-lang/webpack'
      }
    ]
  }
};
```

### 2. Write Your First Component

Create `Counter.jsx.dsl`:

```fst
:label::string
@count::number = 0
!click = count++
<btn @click=click>{label}: {count}</btn>
```

### 3. Use It In React

```tsx
import Counter from './Counter.jsx.dsl';

function App() {
  return <Counter label="My Counter" />;
}
```

## Syntax Reference

| Symbol | Purpose | Example | React Equivalent |
|--------|---------|---------|-----------------|
| `@` | State | `@count = 0` | `useState(0)` |
| `:` | Prop | `:label` | Component props |
| `!` | Event | `!click = count++` | Event handler |
| `$` | Effect | `$log(count)` | `useEffect()` |
| `%` | Memo | `%sum = a + b` | `useMemo()` |
| `::` | Type | `@count::number` | TypeScript type |

## Features

✨ **70% Less Code** - Write React components with minimal syntax
🎯 **TypeScript Support** - Optional type annotations with `::`
🚀 **Zero Runtime** - Compiles to standard React code
🔥 **Hot Reload** - Full HMR support in Vite/Webpack
🎨 **VSCode Extension** - Syntax highlighting and IntelliSense
📦 **Tree Shakeable** - Only bundle what you use

## Examples

### Todo List

```fst
@todos::string[] = []
@input::string = ""
!add = todos.push(input)

<div>
  <input val={input} />
  <btn @click=add>Add</btn>
  <ul>
    <each item in todos>
      <li>{item}</li>
    </each>
  </ul>
</div>
```

### With Effects and Memos

```fst
:userId::number
@data = null
@loading = true

$fetch(userId)
%userName = data?.name || "Loading..."

<div>
  <h1>{userName}</h1>
  {loading ? <span>Loading...</span> : <div>{data}</div>}
</div>
```

## CLI Usage

```bash
# Compile a single file
npx fst input.jsx.dsl

# Watch mode
npx fst input.jsx.dsl --watch

# TypeScript output
npx fst input.jsx.dsl --typescript

# With source maps
npx fst input.jsx.dsl --typescript --sourcemap
```

## VSCode Extension

Install for syntax highlighting and IntelliSense:

```bash
code --install-extension faster-lang
```

## Runtime API (Development)

For prototyping without build tools:

```jsx
import { compile } from 'faster-lang/runtime';

const Counter = compile(`
  @count = 0
  !click = count++
  <btn @click=click>{count}</btn>
`);
```

## TypeScript Support

Add type declarations for `.jsx.dsl` imports:

```ts
// jsx-dsl.d.ts
declare module '*.jsx.dsl' {
  import { FC } from 'react';
  const Component: FC<any>;
  export default Component;
}
```

## Migration Guide

Coming from React? Here's how to convert:

```jsx
// React
const [count, setCount] = useState(0);
const increment = () => setCount(count + 1);

// Faster
@count = 0
!increment = count++
```

## Performance

- **Zero runtime overhead** - compiles to regular React
- **Smaller bundle sizes** - less boilerplate code
- **Fast compilation** - instant feedback during development

## Contributing

We welcome contributions! See [CONTRIBUTING.md](https://github.com/faster/lang/blob/main/CONTRIBUTING.md)

## License

MIT © Faster Lang Contributors

## Links

- [Documentation](https://faster-lang.dev)
- [GitHub](https://github.com/faster/lang)
- [Discord](https://discord.gg/faster-lang)
- [Examples](https://github.com/faster/lang/tree/main/examples)