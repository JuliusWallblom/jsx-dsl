# Vite Plugin for Faster Lang

The official Vite plugin for Faster Lang enables seamless integration of `.jsx.dsl` files in your React projects with zero configuration.

## Installation

```bash
npm install faster-lang
# or
yarn add faster-lang
# or
pnpm add faster-lang
```

## Quick Setup

### 1. Configure Vite

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import faster from 'faster-lang/vite';

export default defineConfig({
  plugins: [
    react(),
    faster() // Add the Faster Lang plugin
  ]
});
```

### 2. Add Type Declarations

Create `src/jsx-dsl.d.ts`:

```typescript
declare module '*.jsx.dsl' {
  import { FC } from 'react';
  const Component: FC<any>;
  export default Component;
}
```

### 3. Write Your First Component

Create `src/components/Counter.jsx.dsl`:

```fst
:label::string
@count::number = 0
!increment = count++
!decrement = count--

<div>
  <h2>{label}</h2>
  <p>Count: {count}</p>
  <btn @click=increment>+</btn>
  <btn @click=decrement>-</btn>
</div>
```

### 4. Use It in React

```tsx
// src/App.tsx
import Counter from './components/Counter.jsx.dsl';

function App() {
  return (
    <div>
      <h1>My App</h1>
      <Counter label="Click Counter" />
    </div>
  );
}

export default App;
```

## Plugin Options

```js
// vite.config.js
faster({
  // Generate TypeScript output (default: true)
  typescript: true,

  // Generate source maps (default: true)
  sourceMap: true,

  // Enable hot module replacement (default: true)
  hmr: true,

  // Include pattern (default: /\.jsx\.dsl$/)
  include: /\.jsx\.dsl$/,

  // Exclude pattern (optional)
  exclude: /node_modules/
})
```

## Features

### ✨ Zero Configuration
Just add the plugin and start using `.jsx.dsl` files. No additional setup required.

### 🔥 Hot Module Replacement
Changes to `.jsx.dsl` files trigger instant updates without losing component state.

### 🎯 TypeScript Support
Automatic TypeScript generation with proper type inference and interfaces.

### 🗺️ Source Maps
Debug your original `.jsx.dsl` code directly in browser devtools.

### ⚡ Fast Compilation
Optimized compilation process with caching for development speed.

### 🔍 Error Handling
Clear error messages with file locations and helpful debugging info.

## Example Projects

### React + TypeScript + Faster

```bash
# Create new Vite project
npm create vite@latest my-app -- --template react-ts
cd my-app

# Install Faster Lang
npm install faster-lang

# Configure (see setup above)
```

### Complete Example Structure

```
my-app/
├── src/
│   ├── components/
│   │   ├── Header.jsx.dsl       # Faster component
│   │   ├── Counter.jsx.dsl      # Faster component
│   │   └── Layout.tsx       # Regular React
│   ├── App.tsx
│   ├── main.tsx
│   └── jsx-dsl.d.ts            # Type declarations
├── vite.config.js          # Plugin configuration
└── package.json
```

## Advanced Usage

### Mixing .jsx.dsl and .tsx Components

```tsx
// Layout.tsx - Regular React component
import Header from './Header.jsx.dsl';
import Footer from './Footer.jsx.dsl';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <>
      <Header title="My App" />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

```fst
// Header.jsx.dsl - Faster component
:title::string
@isMenuOpen::boolean = false
!toggleMenu = isMenuOpen = !isMenuOpen

<header>
  <h1>{title}</h1>
  <btn @click=toggleMenu>Menu</btn>
  {isMenuOpen && <nav>Navigation items...</nav>}
</header>
```

### Environment-Specific Configuration

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import faster from 'faster-lang/vite';

export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    faster({
      // Disable source maps in production
      sourceMap: mode !== 'production',

      // More verbose errors in development
      typescript: true
    })
  ]
}));
```

### Custom Component Names

The plugin automatically generates component names from file names:

```
counter.jsx.dsl        → Counter
user-profile.jsx.dsl   → UserProfile
my_component.jsx.dsl   → MyComponent
```

## Performance

### Development
- **First compilation**: ~50ms per component
- **Hot updates**: ~10ms per component
- **Memory usage**: Minimal overhead

### Production
- **Build time**: Similar to regular React components
- **Bundle size**: No runtime overhead
- **Tree shaking**: Fully supported

## Troubleshooting

### Common Issues

#### 1. Module not found error
```
Error: Cannot resolve module './Component.jsx.dsl'
```

**Solution**: Ensure the plugin is added to your Vite config and the file has the correct `.jsx.dsl` extension.

#### 2. TypeScript errors
```
Cannot find module './Component.jsx.dsl' or its corresponding type declarations
```

**Solution**: Add the `jsx-dsl.d.ts` type declarations file.

#### 3. HMR not working
```
Changes to .jsx.dsl files don't trigger updates
```

**Solution**: Ensure `hmr: true` in plugin options and restart the dev server.

### Debug Mode

Enable debug logging:

```js
// vite.config.js
faster({
  // ... other options
  debug: true // Enable debug logging
})
```

### VSCode Integration

For the best development experience, install the Faster Lang VSCode extension:

```bash
code --install-extension faster-lang-vscode
```

This provides:
- Syntax highlighting
- Error checking
- Auto-completion
- Snippets

## Comparison with Manual Compilation

| Feature | Manual Compilation | Vite Plugin |
|---------|-------------------|-------------|
| Setup | Manual CLI commands | Zero config |
| HMR | ❌ No | ✅ Yes |
| Source Maps | ⚠️ Manual | ✅ Automatic |
| Type Safety | ⚠️ Manual | ✅ Automatic |
| Error Handling | ❌ Basic | ✅ Rich |
| Build Integration | ❌ Manual | ✅ Seamless |

## Contributing

Found a bug or want to contribute? Check out our [GitHub repository](https://github.com/faster/lang).

## License

MIT © Faster Lang Contributors