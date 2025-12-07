# Getting Started with JSX DSL (.jsx.dsl)

## Quick Start for New React Projects

### Option 1: With Vite (Recommended)

```bash
# Create a new Vite React project
npm create vite@latest my-app -- --template react-ts
cd my-app

# Install Fast DSL
npm install fast-dsl

# Add to vite.config.js
```

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import jsxDslPlugin from 'jsx-dsl/vite';

export default defineConfig({
  plugins: [
    jsxDslPlugin({ typescript: true }),
    react()
  ]
});
```

### Option 2: With Create React App

```bash
# Create a new React app
npx create-react-app my-app --template typescript
cd my-app

# Install JSX DSL
npm install jsx-dsl

# Eject to customize webpack (required)
npm run eject

# Add to webpack.config.js
```

```javascript
// webpack.config.js
module.exports = {
  // ... existing config
  module: {
    rules: [
      // ... existing rules
      {
        test: /\.jsx\.dsl$/,
        use: {
          loader: 'jsx-dsl/webpack',
          options: {
            typescript: true
          }
        }
      }
    ]
  }
};
```

### Option 3: With Next.js

```bash
# Create Next.js app
npx create-next-app@latest my-app --typescript
cd my-app

# Install JSX DSL
npm install jsx-dsl

# Add to next.config.js
```

```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.jsx\.dsl$/,
      use: {
        loader: 'jsx-dsl/webpack',
        options: {
          typescript: true
        }
      }
    });
    return config;
  }
};
```

## Using .jsx.dsl Files in Your Project

### 1. Create a component file: `Counter.jsx.dsl`

```jsx-dsl
:label::string
@count::number = 0
!increment = count++

<div>
  <h2>{label}</h2>
  <p>Count: {count}</p>
  <btn @click=increment>Click me</btn>
</div>
```

### 2. Import and use it in your React app:

```tsx
// App.tsx
import Counter from './Counter.jsx.dsl';

function App() {
  return (
    <div>
      <h1>My App</h1>
      <Counter label="My Counter" />
    </div>
  );
}

export default App;
```

### 3. TypeScript Support

Add type declarations for `.jsx.dsl` imports:

```typescript
// jsx-dsl.d.ts
declare module '*.jsx.dsl' {
  import { FC } from 'react';
  const Component: FC<any>;
  export default Component;
}
```

## Development Workflow

### 1. Install VSCode Extension

```bash
code --install-extension path/to/jsx-dsl-0.1.0.vsix
```

### 2. Configure VSCode

Add to `.vscode/settings.json`:

```json
{
  "files.associations": {
    "*.jsx.dsl": "jsx.dsl"
  },
  "editor.formatOnSave": false,
  "[jsx.dsl]": {
    "editor.defaultFormatter": null
  }
}
```

### 3. Hot Module Replacement (HMR)

With Vite, HMR works automatically for `.jsx.dsl` files:

```javascript
// vite.config.js
export default {
  plugins: [
    jsxDslPlugin({
      typescript: true,
      hmr: true // Enable hot reload
    })
  ]
};
```

## NPM Package Installation

### Install from npm (once published):

```bash
npm install jsx-dsl
# or
yarn add jsx-dsl
# or
pnpm add jsx-dsl
```

### Or install from local directory:

```bash
# In the jsx-dsl directory
npm link

# In your React project
npm link jsx-dsl
```

## Build-time vs Runtime

### Build-time Compilation (Recommended)
- Uses webpack/vite loaders
- Zero runtime overhead
- Full TypeScript support
- Better performance

### Runtime Compilation (Experimental)
```javascript
import { compile } from 'jsx-dsl/runtime';

const Counter = compile(`
  @count = 0
  !click = count++
  <btn @click=click>{count}</btn>
`);
```

## Project Structure

```
my-app/
├── src/
│   ├── components/
│   │   ├── Header.jsx.dsl      # JSX DSL component
│   │   ├── Footer.tsx          # Regular TypeScript
│   │   └── Button.jsx.dsl      # JSX DSL component
│   ├── App.tsx
│   └── main.tsx
├── jsx-dsl.d.ts             # TypeScript declarations
├── vite.config.js           # Vite configuration
└── package.json
```

## Common Patterns

### 1. Importing Regular React Components in .jsx.dsl

Currently, `.jsx.dsl` files are self-contained. For complex apps, mix `.jsx.dsl` and `.tsx`:

```tsx
// Layout.tsx - Regular React
import Header from './Header.jsx.dsl';
import Footer from './Footer.jsx.dsl';

export function Layout({ children }) {
  return (
    <>
      <Header title="My App" />
      {children}
      <Footer />
    </>
  );
}
```

### 2. Sharing State Between Components

Use React Context or state management libraries in `.tsx` files:

```tsx
// App.tsx
import { createContext } from 'react';
import Counter from './Counter.jsx.dsl';

export const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Counter label="Themed Counter" />
    </ThemeContext.Provider>
  );
}
```

## Troubleshooting

### Module not found error
- Ensure `.jsx.dsl` file extension is configured in your bundler
- Check that the loader is properly installed

### TypeScript errors
- Add `jsx-dsl.d.ts` declaration file
- Ensure TypeScript knows about `.jsx.dsl` imports

### Compilation errors
- Check `.jsx.dsl` syntax using the CLI tool first
- Verify all symbols (`@`, `:`, `!`, etc.) are correct

## Examples Repository

Clone the examples:
```bash
git clone https://github.com/jsx-dsl/jsx-dsl-examples
cd jsx-dsl-examples
npm install
npm run dev
```

## Support

- GitHub Issues: [Report bugs](https://github.com/jsx-dsl/jsx-dsl)
- Documentation: [Full docs](https://jsx-dsl.dev)
- Discord: [Join community](https://discord.gg/jsx-dsl)