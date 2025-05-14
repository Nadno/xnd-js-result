# js-x-result

A modern TypeScript library for elegant and functional error handling. This library implements the Result Monad pattern, providing an alternative to traditional exception handling.

> **Translations**: [Português (Brasil)](README.pt-BR.md)

## Installation

```bash
npm install @xnd-js/result
```

or

```bash
yarn add @xnd-js/result
```

Alternatively, you can copy the [result.ts](src/result.ts) file directly into your project. This approach can be useful for small projects or when you need to make specific modifications to the implementation.

> **Recommendation:** If your project uses other libraries that also implement the Result pattern, consider using js-x-result directly to maintain consistency. Similarly, external libraries you develop can incorporate this implementation directly to ensure compatibility.

## Basic Concepts

The `js-x-result` library helps you encapsulate results from operations that might fail, allowing for clear and type-safe handling with TypeScript.

> **IMPORTANT:** Always use the `AnyResult<T, E>` type as the return type for functions, never return the `Result` class directly.

## Core API

### Creating Results

```typescript
import Result, { AnyResult } from 'js-x-result';

// Success results
const successResult = Result.ok(42);
const emptySuccess = Result.ok(); // Uses Result.OK as default value

// Failure results
const errorResult = Result.not(new Error('Something went wrong'));
```

### Value Transformation

```typescript
// Transforming successful values
const doubled = Result.ok(21).ok(num => num * 2); // Result.ok(42)

// Error handling
const transformed = Result.not(new Error('Original error'))
  .not(err => ({ type: 'custom_error', message: err.message }));
```

### Method Chaining

```typescript
// Chaining transformations
function processData(input: number): AnyResult<string, Error> {
  return Result.ok(input)
    .ok(num => num * 2)
    .ok(num => {
      if (num > 100) throw new Error('Value too high');
      return num;
    })
    .ok(num => `The result is: ${num}`);
}

const result = processData(30); // Result.ok("The result is: 60")
const errorResult = processData(60); // Result.not(Error("Value too high"))
```

### Value Extraction and Error Handling

```typescript
// Extracting values directly
const value = Result.ok(42).value(); // 42
const transformedValue = Result.ok(42).value(n => n.toString()); // "42"

// Default values for errors
const defaultValue = Result.not(new Error()).defaultValue(0); // 0

// Error handling with or()
const valueOrError = Result.not(new Error('Failed')).or(err => `Error: ${err.message}`); // "Error: Failed"
```

### Async Operations

```typescript
// Converting Promises to Results
async function fetchData(id: string): Promise<AnyResult<any, Error>> {
  const promise = fetch(`https://api.example.com/data/${id}`).then(r => r.json());
  return Result.resolve(promise);
}

// Handling async operations with functional try/catch
async function safeOperation(): Promise<AnyResult<string, Error>> {
  return await Result.tryCatchAsync(async () => {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return data.message;
  });
}
```

## Common Use Cases

### Form Validation

```typescript
function validateForm(form: any): AnyResult<any, {field: string, message: string}> {
  if (!form.username || form.username.length < 3) {
    return Result.not({
      field: 'username',
      message: 'Username must be at least 3 characters'
    });
  }

  if (!form.email.includes('@')) {
    return Result.not({
      field: 'email',
      message: 'Invalid email format'
    });
  }

  return Result.ok(form);
}
```

### File Processing

```typescript
function processFile(fileName: string): AnyResult<any, {code: string, message: string}> {
  if (!fileName.endsWith('.jpg') && !fileName.endsWith('.png')) {
    return Result.not({
      code: 'invalid_format',
      message: 'Unsupported file format'
    });
  }

  return Result.ok({
    name: fileName,
    type: fileName.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
  })
    .ok(metadata => ({
      ...metadata,
      processed: true
    }));
}
```

### API Operations

```typescript
type UserData = {
  name: string;
  email: string;
  isAdmin: boolean;
};

type CustomError = {
  code: string;
  message: string;
  recoverable: boolean;
};

async function fetchUser(
  id: string,
): Promise<AnyResult<UserData, CustomError>> {
  const result = await Result.tryCatchAsync<UserData>(async () => {
    const response = await fetch(`https://api.example.com/users/${id}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const user = await response.json();

    return {
      name: user.name,
      email: user.email,
      isAdmin: user.role === 'admin',
    };
  });

  return result.not((error) => ({
    code: 'api_error',
    message: error.message,
    recoverable: true,
  }));
}

const fetchResult = await fetchUser('user-1');

if (Result.isOk(fetchResult)) {
  console.log('***USER_EMAIL:', fetchResult.data.email);
} else {
  console.error({
    code: fetchResult.error.code,
    message: fetchResult.error.message,
    recoverable: fetchResult.error.recoverable,
  });
}
```

## Best Practices

1. **Use `AnyResult<T, E>` as return type** instead of the `Result` class directly.
2. **Maintain consistency** in error types throughout your application.
3. **Take advantage of method chaining** for clear and readable transformations.
4. **Prefer explicit error handling** instead of relying on exceptions.
5. **Use `defaultValue()` or `or()`** to handle failure cases at the end of a processing chain.

## Complete Examples

The library includes various examples demonstrating potential use cases:

> **Note:** The following examples were generated by AI with the primary focus on TypeScript type validation. They serve as conceptual demonstrations of the library's capabilities, not necessarily as recommended real-world implementations.

- [API and HTTP Requests](src/__examples__/api.examples.ts) - API response handling
- [Authentication](src/__examples__/authentication.examples.ts) - Authentication and authorization flows
- [Business Logic](src/__examples__/business-logic.examples.ts) - Business rule implementation
- [Caching Strategies](src/__examples__/cache-strategies.examples.ts) - Cache management with error handling
- [Data Processing](src/__examples__/data-processing.examples.ts) - Data transformation and validation
- [File Operations](src/__examples__/file-operations.examples.ts) - Reading, writing, and processing files
- [Form Validation](src/__examples__/form-validation.examples.ts) - Validation and processing of inputs
- [HTTP Client](src/__examples__/http-client.examples.ts) - Wrapper for HTTP requests
- [General Examples](src/__examples__/general.examples.ts) - Various use cases and utilities

These examples illustrate the typing possibilities and are useful for understanding how the library handles different error scenarios.

## Contributions

Contributions are welcome! Please open an issue or pull request to suggest changes or improvements.

## Using With Other Libraries

When developing libraries or components that will be used by other projects, consider:

1. **Return `AnyResult`** to maintain consistency with the Result pattern
2. **Export the js-x-result dependency** so consumers of your library can use it without implementation conflicts
3. **Clearly document** that your library depends on the js-x-result implementation

This facilitates integration with other tools and maintains a consistent error handling pattern across the ecosystem.

## License

MIT
