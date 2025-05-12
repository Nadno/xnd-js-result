import { describe, expect, it } from 'vitest';
import Result, { type AnyResult } from '../result';

describe('Result - Integrated Tests', () => {
  describe('Basic Result Operations', () => {
    it('should create a success result with data', () => {
      const result = Result.ok(42);
      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe(42);
      expect(result.error).toBeNull();
    });

    it('should create an error result with error', () => {
      const error = new Error('Something went wrong');
      const result = Result.not(error);
      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toBe(error);
      expect(result.data).toBeNull();
    });

    it('should create result from condition', () => {
      const successResult = Result.from(
        42,
        (value) => value > 0,
        new Error('Value must be positive'),
      );

      const failureResult = Result.from(
        -10,
        (value) => value > 0,
        new Error('Value must be positive'),
      );

      expect(Result.isOk(successResult)).toBe(true);
      expect(successResult.data).toBe(42);

      expect(Result.notOk(failureResult)).toBe(true);
      expect(failureResult.error?.message).toBe('Value must be positive');
    });
  });

  describe('Method Chaining with Simple Values', () => {
    it('should transform values with ok() method', () => {
      const result = Result.ok(42)
        .ok((num) => num * 2)
        .ok((num) => num.toString());

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe('84');
    });

    it('should short-circuit with error result in ok() chain', () => {
      const result = Result.not<Error, number>(new Error('Initial error'))
        .ok((num) => num * 2) // This should not execute
        .ok((num) => 'Success');

      expect(Result.notOk(result)).toBe(true);
      expect(result.error?.message).toBe('Initial error');
    });

    it('should catch exceptions in ok() chain and convert to error result', () => {
      const result = Result.ok(42).ok((num) => {
        if (num > 40) throw new Error('Value too high');
        return num * 2;
      });

      expect(Result.notOk(result)).toBe(true);
      expect(result.error?.message).toBe('Value too high');
    });
  });

  describe('Method Chaining with Objects', () => {
    it('should transform object properties through chaining', () => {
      const simpleObj = { foo: 'bar', qux: 42, bar: true };

      const result = Result.ok(simpleObj)
        .ok((obj) => ({ ...obj, foo: obj.foo.toUpperCase() }))
        .ok((obj) => ({ ...obj, qux: obj.qux * 2 }))
        .ok((obj) => ({ ...obj, newProp: 'added' }));

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toEqual({
        foo: 'BAR',
        qux: 84,
        bar: true,
        newProp: 'added',
      });
    });

    it('should handle errors in object transformations', () => {
      const result = Result.ok({ foo: null, qux: 42 }).ok((obj) => {
        if (obj.foo === null) throw new Error('foo cannot be null');
        return obj;
      });

      expect(Result.notOk(result)).toBe(true);
      expect(result.error?.message).toBe('foo cannot be null');
    });
  });

  describe('Error Transformations with not()', () => {
    it('should transform error with not() method', () => {
      const result = Result.not(new Error('Original error')).not((err) => ({
        code: 500,
        message: `Enhanced error: ${err.message}`,
      }));

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toEqual({
        code: 500,
        message: 'Enhanced error: Original error',
      });
    });

    it('should not execute not() on success result', () => {
      const result = Result.ok(42).not((err) => ({
        code: 500,
        message: err?.message,
      }));

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe(42);
    });
  });

  describe('Complex Chaining with ok() and not()', () => {
    it('should support mixed ok() and not() chains', () => {
      const result = Result.ok(42)
        .ok((num) => num * 2)
        .not((err) => ({ type: 'calculation_error', original: err }))
        .ok((num) => num + 1);

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe(85);
    });

    it('should handle errors in mixed chains properly', () => {
      const result = Result.ok(42)
        .ok((num) => {
          throw new Error('Something failed');
        })
        .not((err) => ({
          type: 'transformed_error',
          message: err.message,
        }))
        .ok((num) => num + 1); // Should not execute

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toEqual({
        type: 'transformed_error',
        message: 'Something failed',
      });
    });
  });

  describe('Practical Use Cases', () => {
    interface User {
      id: string;
      name: string;
      role: 'admin' | 'user';
    }

    interface ApiError {
      code: number;
      message: string;
    }

    it('should handle user data transformation (based on api.examples)', () => {
      // Simulate successful API response
      const apiResult = Result.ok<User, ApiError>({
        id: '123',
        name: 'John Doe',
        role: 'admin',
      });

      const processedResult = apiResult
        .ok((user) => {
          return {
            displayName: user.name,
            isAdmin: user.role === 'admin',
          };
        })
        .not((error) => ({
          source: 'API',
          code: error.code,
          message: error.message,
        }));

      expect(Result.isOk(processedResult)).toBe(true);
      expect(processedResult.data).toEqual({
        displayName: 'John Doe',
        isAdmin: true,
      });
    });

    it('should handle form validation (based on form-validation.examples)', () => {
      interface FormData {
        username: string;
        email: string;
        age: number;
      }

      // Validate form with multiple checks
      function validateForm(
        form: FormData,
      ): AnyResult<FormData, { field: string; message: string }> {
        if (!form.username || form.username.length < 3) {
          return Result.not({
            field: 'username',
            message: 'Username must be at least 3 characters',
          });
        }

        if (!form.email.includes('@')) {
          return Result.not({
            field: 'email',
            message: 'Invalid email format',
          });
        }

        if (form.age < 18) {
          return Result.not({ field: 'age', message: 'Must be 18 or older' });
        }

        return Result.ok(form);
      }

      const validForm: FormData = {
        username: 'johndoe',
        email: 'john@example.com',
        age: 25,
      };

      const invalidForm: FormData = {
        username: 'jo',
        email: 'invalid-email',
        age: 15,
      };

      const validResult = validateForm(validForm).ok((form) => ({
        ...form,
        username: form.username.toUpperCase(),
      }));

      const invalidResult = validateForm(invalidForm).ok((form) => ({
        ...form,
        username: form.username.toUpperCase(),
      }));

      expect(Result.isOk(validResult)).toBe(true);
      expect(validResult.data?.username).toBe('JOHNDOE');

      expect(Result.notOk(invalidResult)).toBe(true);
      expect(invalidResult.error).toEqual({
        field: 'username',
        message: 'Username must be at least 3 characters',
      });
    });

    it('should handle file processing (based on file-operations.examples)', () => {
      interface FileMetadata {
        name: string;
        size: number;
        type: string;
      }

      interface FileError {
        code: string;
        message: string;
      }

      // Simulate file validation and processing
      function processFile(fileName: string): AnyResult<FileMetadata, FileError> {
        if (!fileName.endsWith('.jpg') && !fileName.endsWith('.png')) {
          return Result.not({
            code: 'invalid_format',
            message: 'Unsupported file format',
          });
        }

        return Result.ok({
          name: fileName,
          size: 1024, // Simulated size
          type: fileName.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
        });
      }

      const jpgResult = processFile('photo.jpg')
        .ok((metadata) => ({
          ...metadata,
          processed: true,
          thumbnailGenerated: true,
        }))
        .not((error) => ({
          code: error.code,
          message: `File processing failed: ${error.message}`,
          fatal: true,
        }));

      const invalidResult = processFile('document.pdf').ok((metadata) => ({
        ...metadata,
        processed: true,
      }));

      expect(Result.isOk(jpgResult)).toBe(true);
      expect(jpgResult.data).toMatchObject({
        name: 'photo.jpg',
        processed: true,
        thumbnailGenerated: true,
      });

      expect(Result.notOk(invalidResult)).toBe(true);
      expect(invalidResult.error?.code).toBe('invalid_format');
    });
  });

  describe('Async Operations', () => {
    it('should handle async results with chaining', async () => {
      const asyncResult = Promise.resolve(Result.ok(42));

      const result = await asyncResult;
      const transformed = result
        .ok((num) => num * 2)
        .ok((num) => `The answer is ${num}`);

      expect(Result.isOk(transformed)).toBe(true);
      expect(transformed.data).toBe('The answer is 84');
    });

    it('should handle async errors properly', async () => {
      const fetchData = async () => {
        return Result.resolve<number, Error>(
          new Promise((_, reject) => {
            reject(new Error('Network error'));
          }),
        );
      };

      const result = await fetchData();
      const transformed = result
        .ok((num) => num * 2)
        .not((error) => ({
          type: 'fetch_error',
          message: error.message,
        }));

      expect(Result.notOk(transformed)).toBe(true);
      expect(transformed.error).toEqual({
        type: 'fetch_error',
        message: 'Network error',
      });
    });
  });

  describe('Helper Methods', () => {
    it('should provide default value with defaultValue()', () => {
      const successResult = Result.ok<number, Error>(42);
      const errorResult = Result.not<Error, number>(new Error('Failed'));

      const successDefault = successResult.defaultValue(0);
      const errorDefault = errorResult.defaultValue(0);

      expect(successDefault).toBe(42);
      expect(errorDefault).toBe(0);
    });

    it('should transform with or() method', () => {
      const successResult = Result.ok<string, Error>('success');
      const errorResult = Result.not<Error, string>(new Error('Failed'));

      const successOr = successResult.or((err) => `Error: ${err.message}`);
      const errorOr = errorResult.or((err) => `Error: ${err.message}`);

      expect(successOr).toBe('success');
      expect(errorOr).toBe('Error: Failed');
    });
  });
});
