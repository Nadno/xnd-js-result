import { describe, it, expect, vi } from 'vitest';

import Result from '../result';

describe('Result', () => {
  describe('static constructors', () => {
    it('should create success result with data', () => {
      const data = { id: 1, name: 'test' };
      const result = Result.ok(data);

      expect(Result.isOk(result)).toBe(true);
      expect(Result.notOk(result)).toBe(false);
      expect(result.data).toEqual(data);
      expect(result.error).toBeNull();
    });

    it('should create success result without data', () => {
      const result = Result.ok();

      expect(Result.isOk(result)).toBe(true);
      expect(Result.notOk(result)).toBe(false);
      expect(result.data).toBe(Result.OK);
      expect(result.error).toBeNull();
    });

    it('should create failure result with error', () => {
      const error = new Error('Test error');
      const result = Result.not(error);

      expect(Result.isOk(result)).toBe(false);
      expect(Result.notOk(result)).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
    });
  });

  describe('type guards', () => {
    it('should correctly identify success results', () => {
      const success = Result.ok('test');
      const failure = Result.not(new Error());

      expect(Result.isOk(success)).toBe(true);
      expect(Result.isOk(failure)).toBe(false);
      expect(Result.isOk(null)).toBe(false);
      expect(Result.isOk(undefined)).toBe(false);
    });

    it('should correctly identify failure results', () => {
      const success = Result.ok('test');
      const failure = Result.not(new Error());

      expect(Result.notOk(failure)).toBe(true);
      expect(Result.notOk(success)).toBe(false);
      expect(Result.notOk(null)).toBe(false);
      expect(Result.notOk(undefined)).toBe(false);
    });
  });

  describe('Result.resolve', () => {
    it('should handle successful promises', async () => {
      const promise = Promise.resolve('test');
      const result = await Result.resolve(promise);

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should handle rejected promises', async () => {
      const error = new Error('Test error');
      const promise = Promise.reject(error);
      const result = await Result.resolve(promise);

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('match', () => {
    it('should handle success case with sync result', () => {
      const result = Result.ok('test');
      const handler = (data: string) => data.toUpperCase();

      const matched = Result.match(Result.OK, result, handler);
      expect(matched).toBe('TEST');
    });

    it('should handle failure case with sync result', () => {
      const error = new Error('Test error');
      const result = Result.not(error);
      const handler = (err: Error) => err.message;

      const matched = Result.match(Result.NOT, result, handler);
      expect(matched).toBe('Test error');
    });

    it('should handle success case with async result', async () => {
      const promise = Promise.resolve(Result.ok('test'));
      const handler = (data: string) => data.toUpperCase();

      const matched = await Result.match(Result.OK, promise, handler);
      expect(matched).toBe('TEST');
    });

    it('should handle failure case with async result', async () => {
      const error = new Error('Test error');
      const promise = Promise.resolve(Result.not(error));
      const handler = (err: Error) => err.message;

      const matched = await Result.match(Result.NOT, promise, handler);
      expect(matched).toBe('Test error');
    });

    it('should return null when matching wrong case', () => {
      const success = Result.ok('test');
      const failure = Result.not(new Error('test'));

      const successMatch = Result.match(Result.NOT, success, (err) => err);
      const failureMatch = Result.match(Result.OK, failure, (data) => data);

      expect(successMatch).toBeNull();
      expect(failureMatch).toBeNull();
    });
  });

  describe('match with handlers object', () => {
    it('should match success case with handlers object', () => {
      const result = Result.ok('test');
      const matched = Result.match(result, {
        ok: (data) => (data ? data.toUpperCase() : ''),
      });

      expect(matched).toBe('TEST');
    });

    it('should match failure case with handlers object', () => {
      const error = new Error('Test error');
      const result = Result.not(error);
      const matched = Result.match(result, {
        ok: (data) => String(data),
        not: (err) => (err ? err.message : ''),
      });

      expect(matched).toBe('Test error');
    });

    it('should handle async result with handlers object', async () => {
      const promise = Promise.resolve(Result.ok('test'));
      const matched = await Result.match(promise, {
        ok: (data) => (data ? data.toUpperCase() : ''),
      });

      expect(matched).toBe('TEST');
    });

    it('should work with partial handlers (only success)', () => {
      const success = Result.ok('test');
      const matched = Result.match(success, {
        ok: (data) => (data ? data.toUpperCase() : ''),
      });

      expect(matched).toBe('TEST');
    });

    it('should return null when matching failure with only success handler', () => {
      const failure = Result.not(new Error('Test error'));
      const matched = Result.match(failure, {
        ok: (data) => String(data),
      });

      expect(matched).toBeNull();
    });
  });

  describe('tryCatch', () => {
    it('should return success when callback executes without error', () => {
      const callback = () => 'test';
      const result = Result.tryCatch(callback);

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should return failure when callback throws', () => {
      const error = new Error('Test error');
      const callback = () => {
        throw error;
      };
      const result = Result.tryCatch(callback);

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should handle complex data types', () => {
      const data = { nested: { value: [1, 2, 3] } };
      const callback = () => data;
      const result = Result.tryCatch(callback);

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('tryCatchAsync', () => {
    it('should return success when async callback resolves', async () => {
      const callback = async () => 'test';
      const result = await Result.tryCatchAsync(callback);

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should return failure when async callback rejects', async () => {
      const error = new Error('Test error');
      const callback = async () => {
        throw error;
      };
      const result = await Result.tryCatchAsync(callback);

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should handle async operations with delays', async () => {
      const callback = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'delayed';
      };
      const result = await Result.tryCatchAsync(callback);

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe('delayed');
    });

    it('should handle promise rejections with custom errors', async () => {
      class CustomError extends Error {
        code = 'CUSTOM';
      }

      const error = new CustomError('Custom error');
      const callback = async () => {
        throw error;
      };
      const result = await Result.tryCatchAsync(callback);

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toBe(error);
      expect((result.error as CustomError).code).toBe('CUSTOM');
    });
  });
  describe('from', () => {
    it('should create success result when condition is true', () => {
      const result = Result.from(42, true, new Error('Not used'));

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should create failure result when condition is false', () => {
      const error = new Error('Value must be positive');
      const result = Result.from(-10, false, error);

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should evaluate function condition with value', () => {
      const positive = Result.from(
        42,
        (value) => value > 0,
        new Error('Must be positive'),
      );
      const negative = Result.from(
        -10,
        (value) => value > 0,
        new Error('Must be positive'),
      );

      expect(Result.isOk(positive)).toBe(true);
      expect(Result.notOk(negative)).toBe(true);
    });

    it('should accept function for value', () => {
      const getValue = () => 42;
      const result = Result.from(getValue, true, new Error('Not used'));

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should accept function for error', () => {
      const getError = () => new Error('Generated error');
      const result = Result.from(10, false, getError);

      expect(Result.notOk(result)).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      if (result.error) {
        expect(result.error.message).toBe('Generated error');
      }
    });
  });

  describe('instance methods', () => {
    describe('to', () => {
      it('should transform successful result', () => {
        const result = Result.ok(42);
        const transformed = result.to((num) => num * 2);

        expect(Result.isOk(transformed)).toBe(true);
        expect(transformed.data).toBe(84);
      });

      it('should pass through error for failure result', () => {
        const error = new Error('Original error');
        const result = Result.not(error);
        const transformed = result.to((num) => (num as any) * 2);

        expect(Result.notOk(transformed)).toBe(true);
        expect(transformed.error).toBe(error);
      });
    });

    describe('value', () => {
      it('should return the value directly', () => {
        const result = Result.ok(42);
        const value = result.value();

        expect(value).toBe(42);
      });

      it('should transform the value with a mutator', () => {
        const result = Result.ok(42);
        const value = result.value((num) => num * 2);

        expect(value).toBe(84);
      });

      it('should return null for failure result', () => {
        const result = Result.not(new Error('Test error'));
        const value = result.value();

        expect(value).toBeNull();
      });
    });

    describe('defaultValue', () => {
      it('should return the original value for success result', () => {
        const result = Result.ok(42);
        const value = result.defaultValue(0);

        expect(value).toBe(42);
      });

      it('should return the default value for failure result', () => {
        const result = Result.not(new Error('Test error'));
        const value = result.defaultValue(0);

        expect(value).toBe(0);
      });

      it('should accept a function for the default value', () => {
        const result = Result.not(new Error('Test error'));
        const value = result.defaultValue(() => 100);

        expect(value).toBe(100);
      });
    });

    describe('or', () => {
      it('should return original value for success result', () => {
        const result = Result.ok(42);
        const value = result.or(() => 0);

        expect(value).toBe(42);
      });

      it('should return callback result for failure', () => {
        const result = Result.not(new Error('Test error'));
        const value = result.or((err) => 'Failed: ' + err.message);

        expect(value).toBe('Failed: Test error');
      });
    });
  });

  describe('chaining methods', () => {
    describe('ok method', () => {
      it('should transform successful result', () => {
        const result = Result.ok(42);
        const transformed = result.ok((num) => num! * 2);

        expect(Result.isOk(transformed)).toBe(true);
        expect(transformed.data).toBe(84);
      });

      it('should pass through failure result', () => {
        const error = new Error('Test error');
        const result = Result.not(error);
        const transformed = result.ok((num) => num! * 2);

        expect(Result.notOk(transformed)).toBe(true);
        expect(transformed.error).toBe(error);
      });

      it('should handle thrown errors in callback', () => {
        const result = Result.ok(42);
        const transformed = result.ok(() => {
          throw new Error('Callback error');
        });

        expect(Result.notOk(transformed)).toBe(true);
        expect(transformed.error).toBeInstanceOf(Error);
        if (transformed.error) {
          expect(transformed.error.message).toBe('Callback error');
        }
      });

      it('should support method chaining', () => {
        const result = Result.ok(42)
          .ok((num) => num! * 2)
          .ok((num) => String(num));

        expect(Result.isOk(result)).toBe(true);
        expect(result.data).toBe('84');
      });
    });

    describe('not method', () => {
      it('should transform failure result', () => {
        const error = new Error('Original error');
        const result = Result.not(error);
        const transformed = result.not((err) =>
          err ? 'Transformed: ' + err.message : '',
        );

        expect(Result.notOk(transformed)).toBe(true);
        expect(transformed.error).toBe('Transformed: Original error');
      });

      it('should pass through successful result', () => {
        const result = Result.ok(42);
        const transformed = result.not(() => 'Transformed error');

        expect(Result.isOk(transformed)).toBe(true);
        expect(transformed.data).toBe(42);
      });

      it('should handle thrown errors in callback', () => {
        const error = new Error('Original error');
        const result = Result.not(error);
        const transformed = result.not(() => {
          throw new Error('Callback error');
        });

        expect(Result.notOk(transformed)).toBe(true);
        expect(transformed.error).toBeInstanceOf(Error);
        if (transformed.error) {
          expect(transformed.error.message).toBe('Callback error');
        }
      });

      it('should support method chaining with ok', () => {
        const result = Result.not(new Error('Start error'))
          .not((err) => (err ? err.message : ''))
          .not((msg) => 'Modified: ' + msg);

        expect(Result.notOk(result)).toBe(true);
        expect(result.error).toBe('Modified: Start error');
      });
    });
  });

  describe('throwIfNotOk', () => {
    it('should not throw for successful result', () => {
      const result = Result.ok(42);
      expect(() => result.throwIfNotOk()).not.toThrow();
    });

    it('should throw the error for failure result', () => {
      const error = new Error('Test error');
      const result = Result.not(error);
      expect(() => result.throwIfNotOk()).toThrow(error);
    });
  });

  describe('lazy evaluation', () => {
    it('should not evaluate data function until accessed', () => {
      const spy = vi.fn().mockReturnValue(42);
      const result = Result.ok(spy);

      expect(spy).not.toHaveBeenCalled();
      expect(result.data).toBe(42);
      expect(spy).toHaveBeenCalledTimes(1);

      // Second access should not call the function again
      expect(result.data).toBe(42);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not evaluate error function until accessed', () => {
      const spy = vi.fn().mockReturnValue(new Error('Lazy error'));
      const result = Result.not(spy);

      expect(spy).not.toHaveBeenCalled();
      expect(result.error).toBeInstanceOf(Error);
      expect(spy).toHaveBeenCalledTimes(1);

      // Second access should not call the function again
      expect(result.error).toBeInstanceOf(Error);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('complex cases and combinations', () => {
    it('should handle nested transformations correctly', () => {
      const result = Result.ok({ value: 42 })
        .ok((data) => (data?.value ? { doubled: data.value * 2 } : null))
        .ok((data) =>
          data?.doubled ? { result: String(data.doubled) } : null,
        );

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toEqual({ result: '84' });
    });

    it('should support error recovery with not()', () => {
      const result = Result.not(new Error('Initial error'))
        .not((err) => (err ? 'Recovered' : ''))
        .ok((message) => `Success: ${message}`);

      expect(Result.isOk(result)).toBe(false);
      expect(result.error).toBe('Recovered');
    });

    it('should handle combined async and sync operations', async () => {
      const asyncResult = await Result.resolve(Promise.resolve(42));
      const finalResult = asyncResult
        .ok((value) => (value !== null ? value * 2 : 0))
        .defaultValue(0);

      expect(finalResult).toBe(84);
    });

    it('should maintain type safety through transformations', () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: 'Test User' };
      const result = Result.ok(user)
        .ok((u) => (u ? { ...u, active: true } : null))
        .to((u) => (u ? u.name : ''));

      expect(Result.isOk(result)).toBe(true);
      expect(result.data).toBe('Test User');
    });
  });
});
