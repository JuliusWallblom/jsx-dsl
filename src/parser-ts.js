import { TOKEN_TYPES } from './tokenizer-ts.js';

const MODIFIER_REDUCER = 'reducer';

export function parse(tokens) {
  let position = 0;
  const ast = {
    type: 'Component',
    props: [],
    states: [],
    reducers: [],
    contexts: [],
    effects: [],
    memos: [],
    events: {},
    jsx: null
  };

  const peek = (offset = 0) => tokens[position + offset];
  const advance = () => tokens[position++];
  const isAtEnd = () => position >= tokens.length || peek()?.type === TOKEN_TYPES.EOF;

  const consume = (type, message) => {
    if (peek()?.type !== type) {
      throw new Error(message || `Expected ${type} but got ${peek()?.type}`);
    }
    return advance();
  };

  const skipNewlines = () => {
    while (peek()?.type === TOKEN_TYPES.NEWLINE) {
      advance();
    }
  };

  // Parse type annotation: :: type
  const parseTypeAnnotation = () => {
    if (peek()?.type !== TOKEN_TYPES.COLON_TYPE) {
      return null;
    }
    consume(TOKEN_TYPES.COLON_TYPE);
    return parseType();
  };

  // Parse TypeScript type
  const parseType = () => {
    const types = [];

    // Parse primary type
    let currentType = parsePrimaryType();
    types.push(currentType);

    // Handle union types (|)
    while (peek()?.type === TOKEN_TYPES.PIPE) {
      advance();
      types.push(parsePrimaryType());
    }

    if (types.length === 1) {
      return types[0];
    }

    return { type: 'UnionType', types };
  };

  const parsePrimaryType = () => {
    const token = peek();

    if (token?.type === TOKEN_TYPES.IDENTIFIER) {
      const name = advance().value;

      // Check for array type
      if (peek()?.type === TOKEN_TYPES.LBRACKET) {
        advance();
        consume(TOKEN_TYPES.RBRACKET);
        return { type: 'ArrayType', elementType: name };
      }

      // Check for generic type
      if (peek()?.type === TOKEN_TYPES.LT) {
        advance();
        const genericTypes = [];
        genericTypes.push(parseType());
        while (peek()?.type === TOKEN_TYPES.COMMA) {
          advance();
          genericTypes.push(parseType());
        }
        consume(TOKEN_TYPES.GT);
        return { type: 'GenericType', name, typeParams: genericTypes };
      }

      return { type: 'SimpleType', name };
    }

    throw new Error(`Expected type but got ${token?.type}`);
  };

  // Parse prop declaration: :name or :name::type
  const parseProp = () => {
    consume(TOKEN_TYPES.PROP);
    const name = consume(TOKEN_TYPES.IDENTIFIER, 'Expected prop name').value;
    const typeAnnotation = parseTypeAnnotation();
    ast.props.push({ name, type: typeAnnotation });
  };

  // Parse state declaration: @name = value or @name::type = value
  // Or reducer declaration: @name:reducer = value
  const parseState = () => {
    consume(TOKEN_TYPES.STATE);
    const name = consume(TOKEN_TYPES.IDENTIFIER, 'Expected state name').value;

    // Check for :reducer modifier
    if (peek()?.type === TOKEN_TYPES.PROP && peek(1)?.type === TOKEN_TYPES.IDENTIFIER && peek(1)?.value === MODIFIER_REDUCER) {
      advance(); // consume :
      advance(); // consume 'reducer'
      consume(TOKEN_TYPES.ASSIGN);
      const reducerValue = parseReducerValue();
      ast.reducers.push({ name, ...reducerValue });
      return;
    }

    const typeAnnotation = parseTypeAnnotation();
    consume(TOKEN_TYPES.ASSIGN);
    const value = parseExpression();
    ast.states.push({ name, type: typeAnnotation, initialValue: value });
  };

  // Parse reducer value: {initialValue, {actions}} or just initialValue
  const parseReducerValue = () => {
    if (peek()?.type !== TOKEN_TYPES.LBRACE) {
      // Simple initial value without actions
      return { initialValue: parseExpression(), actions: [] };
    }

    consume(TOKEN_TYPES.LBRACE);
    const initialValue = parseExpression();
    consume(TOKEN_TYPES.COMMA);

    // Parse actions object
    consume(TOKEN_TYPES.LBRACE);
    const actions = [];
    while (peek()?.type !== TOKEN_TYPES.RBRACE) {
      const actionName = consume(TOKEN_TYPES.IDENTIFIER, 'Expected action name').value;
      consume(TOKEN_TYPES.PROP); // :
      const handler = parseExpression();
      actions.push({ name: actionName, handler });

      if (peek()?.type === TOKEN_TYPES.COMMA) {
        advance();
      }
    }
    consume(TOKEN_TYPES.RBRACE); // close actions
    consume(TOKEN_TYPES.RBRACE); // close reducer object

    return { initialValue, actions };
  };

  // Parse effect declaration: $functionName(args)
  const parseEffect = () => {
    consume(TOKEN_TYPES.EFFECT);
    const functionName = consume(TOKEN_TYPES.IDENTIFIER, 'Expected function name').value;
    consume(TOKEN_TYPES.LPAREN);

    const args = [];
    while (peek()?.type !== TOKEN_TYPES.RPAREN) {
      args.push(parseExpression());
      if (peek()?.type === TOKEN_TYPES.COMMA) {
        advance();
      }
    }
    consume(TOKEN_TYPES.RPAREN);

    ast.effects.push({ functionName, args });
  };

  // Parse memo declaration: %name = expression or %name::type = expression
  const parseMemo = () => {
    consume(TOKEN_TYPES.MEMO);
    const name = consume(TOKEN_TYPES.IDENTIFIER, 'Expected memo name').value;
    const typeAnnotation = parseTypeAnnotation();
    consume(TOKEN_TYPES.ASSIGN);
    const value = parseExpression();
    ast.memos.push({ name, type: typeAnnotation, value });
  };

  // Parse event handler: !name = expression
  const parseEvent = () => {
    consume(TOKEN_TYPES.EVENT);
    const name = consume(TOKEN_TYPES.IDENTIFIER, 'Expected event name').value;
    consume(TOKEN_TYPES.ASSIGN);
    const handler = parseExpression();
    ast.events[name] = handler;
  };

  // Parse context consumption: &contextName or &contextName::Type
  const parseContext = () => {
    consume(TOKEN_TYPES.CONTEXT);
    const name = consume(TOKEN_TYPES.IDENTIFIER, 'Expected context name').value;
    const typeAnnotation = parseTypeAnnotation();
    ast.contexts.push({ name, type: typeAnnotation });
  };

  // Parse expressions (simplified for now)
  const parseExpression = () => {
    const token = peek();

    if (token?.type === TOKEN_TYPES.NUMBER) {
      advance();
      return { type: 'Literal', value: token.value };
    }

    if (token?.type === TOKEN_TYPES.STRING) {
      advance();
      return { type: 'Literal', value: `"${token.value}"` };
    }

    if (token?.type === TOKEN_TYPES.IDENTIFIER) {
      const name = advance().value;

      // Check for arrow function: param => body
      if (peek()?.type === TOKEN_TYPES.ARROW) {
        advance(); // consume =>
        const body = parseExpression();
        return { type: 'ArrowFunction', params: [name], body };
      }

      // Check for increment/decrement
      if (peek()?.type === TOKEN_TYPES.INCREMENT) {
        advance();
        return { type: 'Update', target: name, operator: '++' };
      }

      if (peek()?.type === TOKEN_TYPES.DECREMENT) {
        advance();
        return { type: 'Update', target: name, operator: '--' };
      }

      // Check for compound assignment
      if (peek()?.type === TOKEN_TYPES.PLUS_ASSIGN) {
        advance();
        const value = parseExpression();
        return { type: 'Update', target: name, operator: '+=', value };
      }

      // Check for binary operations
      if (peek()?.type === TOKEN_TYPES.PLUS) {
        advance();
        const right = parseExpression();
        return { type: 'BinaryOp', operator: '+', left: { type: 'Identifier', name }, right };
      }

      if (peek()?.type === TOKEN_TYPES.MINUS) {
        advance();
        const right = parseExpression();
        return { type: 'BinaryOp', operator: '-', left: { type: 'Identifier', name }, right };
      }

      if (peek()?.type === TOKEN_TYPES.MULTIPLY) {
        advance();
        const right = parseExpression();
        return { type: 'BinaryOp', operator: '*', left: { type: 'Identifier', name }, right };
      }

      if (peek()?.type === TOKEN_TYPES.SLASH) {
        advance();
        const right = parseExpression();
        return { type: 'BinaryOp', operator: '/', left: { type: 'Identifier', name }, right };
      }

      // Check for method call or property access
      if (peek()?.type === TOKEN_TYPES.DOT) {
        advance();
        const property = consume(TOKEN_TYPES.IDENTIFIER, 'Expected property or method name').value;

        // Check if it's a method call (has parentheses)
        if (peek()?.type === TOKEN_TYPES.LPAREN) {
          consume(TOKEN_TYPES.LPAREN);
          const args = [];
          while (peek()?.type !== TOKEN_TYPES.RPAREN) {
            args.push(parseExpression());
            if (peek()?.type === TOKEN_TYPES.COMMA) {
              advance();
            }
          }
          consume(TOKEN_TYPES.RPAREN);
          return { type: 'MethodCall', object: name, method: property, args };
        } else {
          // Property access
          return { type: 'PropertyAccess', object: name, property };
        }
      }

      return { type: 'Identifier', name };
    }

    // Handle arrays
    if (token?.type === TOKEN_TYPES.LBRACKET) {
      advance();
      const elements = [];
      while (peek()?.type !== TOKEN_TYPES.RBRACKET) {
        elements.push(parseExpression());
        if (peek()?.type === TOKEN_TYPES.COMMA) {
          advance();
        }
      }
      consume(TOKEN_TYPES.RBRACKET);
      return { type: 'Array', elements };
    }

    throw new Error(`Unexpected token in expression: ${token?.type}`);
  };

  // Parse JSX
  const parseJSX = () => {
    const elements = [];

    while (!isAtEnd() && peek()?.type === TOKEN_TYPES.LT) {
      elements.push(parseJSXElement());
      skipNewlines();
    }

    return elements.length === 1 ? elements[0] : { type: 'JSXFragment', children: elements };
  };

  const parseJSXElement = () => {
    consume(TOKEN_TYPES.LT);
    const tagName = consume(TOKEN_TYPES.IDENTIFIER, 'Expected tag name').value;

    const attributes = [];

    // Parse attributes
    while (peek()?.type !== TOKEN_TYPES.GT && peek()?.type !== TOKEN_TYPES.SLASH) {
      if (peek()?.type === TOKEN_TYPES.STATE && peek(1)?.type === TOKEN_TYPES.IDENTIFIER) {
        // Special syntax for @click=handler
        advance();
        const name = advance().value;
        consume(TOKEN_TYPES.ASSIGN);
        const value = consume(TOKEN_TYPES.IDENTIFIER).value;
        attributes.push({ name, value: { type: 'EventHandler', handler: value } });
      } else if (peek()?.type === TOKEN_TYPES.IDENTIFIER) {
        const name = advance().value;
        if (peek()?.type === TOKEN_TYPES.ASSIGN) {
          advance();
          if (peek()?.type === TOKEN_TYPES.LBRACE) {
            advance();
            const value = parseExpression();
            consume(TOKEN_TYPES.RBRACE);
            attributes.push({ name, value });
          } else {
            const value = parseExpression();
            attributes.push({ name, value });
          }
        } else {
          // Boolean attribute (no value)
          attributes.push({ name, value: { type: 'Literal', value: 'true' } });
        }
      } else {
        // Skip unknown tokens
        advance();
      }
    }

    // Self-closing tag
    if (peek()?.type === TOKEN_TYPES.SLASH) {
      advance();
      consume(TOKEN_TYPES.GT);
      return { type: 'JSXElement', tagName, attributes, children: [] };
    }

    consume(TOKEN_TYPES.GT);

    const children = [];

    // Parse children
    while (!(peek()?.type === TOKEN_TYPES.LT && peek(1)?.type === TOKEN_TYPES.SLASH)) {
      if (peek()?.type === TOKEN_TYPES.LT) {
        // Check for <each> special tag
        if (peek(1)?.type === TOKEN_TYPES.IDENTIFIER && peek(1)?.value === 'each') {
          children.push(parseEachLoop());
        } else {
          children.push(parseJSXElement());
        }
      } else if (peek()?.type === TOKEN_TYPES.LBRACE) {
        advance();
        const expr = parseExpression();
        consume(TOKEN_TYPES.RBRACE);
        children.push({ type: 'JSXExpression', expression: expr });
      } else if (peek()?.type === TOKEN_TYPES.IDENTIFIER ||
                 peek()?.type === TOKEN_TYPES.STRING ||
                 peek()?.type === TOKEN_TYPES.NUMBER) {
        const text = advance();
        children.push({ type: 'JSXText', value: text.value });
      } else if (peek()?.type === TOKEN_TYPES.MINUS) {
        advance();
        children.push({ type: 'JSXText', value: '-' });
      } else if (peek()?.type === TOKEN_TYPES.PLUS) {
        advance();
        children.push({ type: 'JSXText', value: '+' });
      } else if (peek()?.type === TOKEN_TYPES.PROP) {
        advance();
        children.push({ type: 'JSXText', value: ':' });
      } else {
        advance(); // Skip unknown tokens
      }
    }

    // Closing tag
    consume(TOKEN_TYPES.LT);
    consume(TOKEN_TYPES.SLASH);
    const closingTag = consume(TOKEN_TYPES.IDENTIFIER).value;
    if (closingTag !== tagName) {
      throw new Error(`Mismatched closing tag: expected ${tagName} but got ${closingTag}`);
    }
    consume(TOKEN_TYPES.GT);

    return { type: 'JSXElement', tagName, attributes, children };
  };

  const parseEachLoop = () => {
    consume(TOKEN_TYPES.LT);
    const each = consume(TOKEN_TYPES.IDENTIFIER);
    if (each.value !== 'each') {
      throw new Error('Expected "each" in loop');
    }

    const item = consume(TOKEN_TYPES.IDENTIFIER, 'Expected item variable').value;

    // Optional type annotation for the item
    let itemType = null;
    if (peek()?.type === TOKEN_TYPES.COLON_TYPE) {
      itemType = parseTypeAnnotation();
    }

    const inKeyword = consume(TOKEN_TYPES.IDENTIFIER);
    if (inKeyword.value !== 'in') {
      throw new Error('Expected "in" in each loop');
    }
    const list = consume(TOKEN_TYPES.IDENTIFIER, 'Expected list variable').value;
    consume(TOKEN_TYPES.GT);

    skipNewlines(); // Skip any newlines before template

    // Parse the template
    const template = parseJSXElement();

    skipNewlines(); // Skip any newlines before closing tag

    // Parse closing </each>
    consume(TOKEN_TYPES.LT);
    consume(TOKEN_TYPES.SLASH);
    consume(TOKEN_TYPES.IDENTIFIER); // each
    consume(TOKEN_TYPES.GT);

    return { type: 'EachLoop', item, itemType, list, template };
  };

  // Main parsing loop
  while (!isAtEnd()) {
    skipNewlines();
    if (isAtEnd()) break;

    const token = peek();

    switch (token?.type) {
      case TOKEN_TYPES.PROP:
        parseProp();
        break;
      case TOKEN_TYPES.STATE:
        parseState();
        break;
      case TOKEN_TYPES.EFFECT:
        parseEffect();
        break;
      case TOKEN_TYPES.MEMO:
        parseMemo();
        break;
      case TOKEN_TYPES.EVENT:
        parseEvent();
        break;
      case TOKEN_TYPES.CONTEXT:
        parseContext();
        break;
      case TOKEN_TYPES.LT:
        ast.jsx = parseJSX();
        break;
      default:
        throw new Error(`Unexpected token: ${token?.type} at line ${token?.line}`);
    }

    skipNewlines();
  }

  return ast;
}