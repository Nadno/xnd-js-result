/**
 * Represents a successful result.
 * @template T The type of the successful value.
 */
export type Ok<T, E = Error> = Result<T, null> &
  ResultMethods<T, E> & {
    data: T;
    error: E | null;
  };

/**
 * Represents a failed result.
 * @template E The type of the error value.
 */
export type Not<E, T = null> = Result<null, E> &
  ResultMethods<T, E> & {
    data: T | null;
    error: E;
  };

export type AnyResult<T, E = Error> = Ok<T, E> | Not<E, T>;

export type ResultMethods<T, E = Error> = {
  defaultValue<TValue = T>(value: TValue | ((data: T) => TValue)): TValue;

  value<TValue>(mutator: (data: T) => TValue): TValue;
  value(): T;
  value<TValue = T>(mutator?: (data: T) => TValue): TValue | T | null;

  or<TReturn>(callback: (error: E) => TReturn): T | TReturn;

  throwIfNotOk(): void;
} & ResultChainMethods<T, E>;

export type ResultChainMethods<T, E = Error> = {
  ok<TError = Error>(
    callback: (data: NonNullable<T>, result: Ok<T>) => void | never | undefined,
  ): AnyResult<T, TError | E>;
  ok<TReturn, TError = E>(
    callback: (data: NonNullable<T>, result: Ok<T>) => TReturn,
  ): AnyResult<TReturn, TError>;

  not<TData = T>(
    callback: (
      error: NonNullable<E>,
      result: Not<E>,
    ) => void | never | undefined,
  ): AnyResult<TData, E>;
  not<TReturn, TData = T>(
    callback: (error: NonNullable<E>, result: Not<E>) => TReturn,
  ): AnyResult<TData, TReturn>;

  to<TReturn>(mutator: (data: T) => TReturn): AnyResult<TReturn, E>;
};

export type OkValue = 'ok';

export type NotValue = 'not';

export type MatchTypes = OkValue | NotValue;

export type ResultMatchHandler<TResult, TReturn = void> = (
  result: TResult,
) => TReturn;

export type ResultMatchHandlers<
  TData = any,
  TError = any,
  TSReturn = any,
  TFReturn = any,
> = {
  ok: ResultMatchHandler<TData, TSReturn>;
  not: ResultMatchHandler<TError, TFReturn>;
};

export type TryCatchFunction<TData = void> = () => TData;

const handleSuccess = <TData>(
  handler: Function,
  result: Result<TData, any> | Promise<Result<TData, any>>,
): any => {
  if (result instanceof Promise)
    return result.then((value) =>
      Result.isOk(value) ? handler(value.data) : null,
    );

  if (!Result.isOk(result)) return null;
  return handler(result.data);
};

const handleFailure = <TError>(
  handler: Function,
  result: Result<any, TError> | Promise<Result<any, TError>>,
): TError | Promise<TError> | null => {
  if (result instanceof Promise)
    return result
      .then((value) => (Result.notOk(value) ? handler(value.error) : null))
      .catch((value) => handler(value));

  if (!Result.notOk(result)) return null;
  return handler(result.error);
};

// export default interface Result<T, E = Error> {
//   new (dataOrFn: T | (() => T)): Ok<T, E>;
//   new (
//     dataOrFn: null,
//     errorOrFn: E | null | (() => E) ,
//   ): Not<E>;

// }

/**
 * Represents either a successful or failed result.
 * @template T The type of the successful value.
 * @template E The type of the error value.
 */
export default class Result<T, E = Error> {
  public static readonly OK: OkValue = 'ok';
  public static readonly NOT: NotValue = 'not';

  /**
   * Creates a `Result` from a value or a condition.
   * @template TData The type of the successful value.
   * @template TError The type of the error value.
   * @param value The value to evaluate or a function that returns the value.
   * @param condition A boolean or a function that determines if the value is a success.
   * @param error The error to use if the condition fails.
   * @returns A `Result` that is either a success or a failure based on the condition.
   * @example
   * // Example 1: Creating a Result from a condition
   * const result = Result.from(42, (value) => value > 0, new Error('Value must be positive'));
   * console.log(result.data); // 42
   *
   * const failureResult = Result.from(-1, (value) => value > 0, new Error('Value must be positive'));
   * console.log(failureResult.error); // Error: Value must be positive
   *
   * // Example 2: Using a static condition
   * const staticResult = Result.from(42, true, new Error('This will not be used'));
   * console.log(staticResult.data); // 42
   */
  public static from<TData, TError = Error>(
    value: TData | (() => TData),
    condition: boolean | ((value: TData) => boolean),
    error: TError | (() => TError),
  ): AnyResult<TData, TError> {
    const resolvedValue =
      typeof value === 'function' ? (value as () => TData)() : value;

    const isOk =
      typeof condition === 'function'
        ? (condition as (value: TData) => boolean)(resolvedValue)
        : condition;

    if (isOk) {
      return Result.ok(resolvedValue);
    }

    const resolvedError =
      typeof error === 'function' ? (error as () => TError)() : error;
    return Result.not(resolvedError);
  }

  public static notOk<E = Error, T = null>(
    result: AnyResult<T, E>,
  ): result is Not<E, T>;
  public static notOk<E = Error>(result: any): result is Not<E>;
  public static notOk<E = Error, T = null>(result: any): result is Not<E, T> {
    return !!result && result instanceof Result && result.error !== null;
  }

  public static isOk<T, E = Error>(result: AnyResult<T, E>): result is Ok<T, E>;
  public static isOk<T, E = Error>(result: any): result is Ok<T>;
  public static isOk<T, E = Error>(result: any): result is Ok<T, E> {
    return !!result && result instanceof Result && result.error === null;
  }

  /**
   * Creates a failed result.
   * @template TError The type of the error value.
   * @param errorOrFn The error or a function that returns the error.
   * @returns A failed result containing the error.
   * @example
   * const result = Result.not(new Error('Something went wrong'));
   * console.log(result.error); // Error: Something went wrong
   */

  public static not<E = Error, T = null>(errorOrFn: E | (() => E)): Not<E, T> {
    return new Result(null, errorOrFn) as Not<E, T>;
  }

  /**
   * Creates a successful result.
   * @template TData The type of the successful value.
   * @param dataOrFn The value or a function that returns the value.
   * @returns A successful result containing the value.
   * @example
   * const result = Result.ok(42);
   * console.log(result.data); // 42
   */
  public static ok(): Ok<OkValue>;
  public static ok<T, E = Error>(dataOrFn: T | (() => T)): Ok<T, E>;
  public static ok<T>(dataOrFn: T | (() => T)): Ok<T>;
  public static ok<T>(
    dataOrFn: T | (() => T) | string = Result.OK,
  ): Ok<T | string> {
    return new Result(dataOrFn as T | string) as Ok<T>;
  }

  /**
   * Resolves a promise into a result.
   * @template TData The type of the successful value.
   * @template TError The type of the error value.
   * @param promise The promise to resolve.
   * @returns A promise that resolves to a result.
   * @example
   * const result = await Result.resolve(fetchData());
   * if (Result.isOk(result)) {
   *   console.log(result.data);
   * } else {
   *   console.error(result.error);
   * }
   */
  public static async resolve<TData, TError = Error>(
    promise: Promise<TData>,
  ): Promise<AnyResult<TData, TError>> {
    try {
      return new Result(await promise, null) as Ok<TData, TError>;
    } catch (error) {
      return new Result(null, error) as Not<TError, TData>;
    }
  }

  public static tryCatchAsync<TData, TError = Error>(
    callback: TryCatchFunction<Promise<TData>>,
  ): Promise<AnyResult<TData, TError>> {
    return Result.resolve<TData, TError>(callback());
  }

  /**
   * Executes a function and captures its result or error.
   * @template TData The type of the successful value.
   * @template TError The type of the error value.
   * @param callback The function to execute.
   * @returns A result containing the function's return value or error.
   * @example
   * const result = Result.tryCatch(() => JSON.parse('{"key": "value"}'));
   * if (Result.isOk(result)) {
   *   console.log(result.data);
   * } else {
   *   console.error(result.error);
   * }
   */
  public static tryCatch<TData, TError = Error>(
    callback: TryCatchFunction<TData>,
  ): Result<TData, TError> {
    try {
      return new Result(callback(), null as TError);
    } catch (error) {
      return new Result(null as TData, error as TError);
    }
  }

  public static match<TError, TData, TNReturn>(
    action: NotValue,
    result: Promise<AnyResult<TData, TError>>,
    handler: ResultMatchHandler<TError, TNReturn>,
  ): Promise<TNReturn | null>;
  public static match<TData, TError, TOReturn>(
    action: OkValue,
    result: Promise<AnyResult<TData, TError>>,
    handler: ResultMatchHandler<TData, TOReturn>,
  ): Promise<TOReturn | null>;
  public static match<TError, TData, TNReturn>(
    action: NotValue,
    result: AnyResult<TData, TError>,
    handler: ResultMatchHandler<TError, TNReturn>,
  ): TNReturn | null;
  public static match<TData, TError, TOReturn>(
    action: OkValue,
    result: AnyResult<TData, TError>,
    handler: ResultMatchHandler<TData, TOReturn>,
  ): TOReturn | null;
  /**
   * Matches a result against handlers for success and failure.
   * @template TData The type of the successful value.
   * @template TError The type of the error value.
   * @template TSReturn The return type for the success handler.
   * @template TFReturn The return type for the failure handler.
   * @param result The result to match.
   * @param handlers An object containing success and failure handlers.
   * @returns The return value of the matched handler.
   * @example
   * // Example 1: Matching a synchronous result
   * const result = Result.ok(42);
   * const message = Result.match(result, {
   *   ok: (data) => `Success: ${data}`,
   *   not: (error) => `Error: ${error.message}`,
   * });
   * console.log(message); // Success: 42
   *
   * // Example 2: Matching an asynchronous result
   * const asyncResult = Result.resolve(Promise.resolve(42));
   * const asyncMessage = await Result.match(asyncResult, {
   *   ok: (data) => `Success: ${data}`,
   *   not: (error) => `Error: ${error.message}`,
   * });
   * console.log(asyncMessage); // Success: 42
   *
   * // Example 3: Using action-based matching
   * const result = Result.ok(42);
   * const successMessage = Result.match(Result.OK, result, (data) => `Success: ${data}`);
   * console.log(successMessage); // Success: 42
   *
   * const failureResult = Result.not(new Error('Something went wrong'));
   * const errorMessage = Result.match(Result.NOT, failureResult, (error) => `Error: ${error.message}`);
   * console.log(errorMessage); // Error: Something went wrong
   *
   * // Example 4: Matching with partial handlers
   * const partialMessage = Result.match(result, {
   *   ok: (data) => `Success: ${data}`,
   * });
   * console.log(partialMessage); // Success: 42
   */
  public static match<TError, TData, TOReturn, TNReturn>(
    result: Promise<AnyResult<TData, TError>>,
    handlers: ResultMatchHandlers<TData, TError, TOReturn, TNReturn>,
  ): Promise<TOReturn | TNReturn>;
  public static match<TError, TData, TOReturn, TNReturn>(
    result: AnyResult<TData, TError>,
    handlers: ResultMatchHandlers<TData, TError, TOReturn, TNReturn>,
  ): TOReturn | TNReturn;
  public static match<TError, TData, TOReturn, TNReturn>(
    result: Promise<AnyResult<TData, TError>>,
    handlers: Pick<
      ResultMatchHandlers<TData, TError, TOReturn, TNReturn>,
      'ok'
    >,
  ): Promise<TOReturn | TNReturn | null>;
  public static match<TError, TData, TOReturn, TNReturn>(
    result: AnyResult<TData, TError>,
    handlers: Pick<
      ResultMatchHandlers<TData, TError, TOReturn, TNReturn>,
      'ok'
    >,
  ): TOReturn | TNReturn | null;
  public static match(...args: any[]): any | Promise<any> {
    if (args.length === 2) {
      const [result, handlers] = args as [
        Ok<any> | Not<any> | Promise<Ok<any> | Not<any>>,
        ResultMatchHandlers,
      ];

      if (result instanceof Promise)
        return result
          .then((awaitedResult) => {
            if (Result.isOk(awaitedResult))
              return handlers.ok(awaitedResult.data);
            return null;
          })
          .catch((reason) => (handlers.not ? handlers.not(reason) : null));

      if (Result.isOk(result)) return handlers.ok(result.data);

      return handlers.not ? handlers.not((result as any).error) : null;
    }

    const [action, result, handler] = args as [
      MatchTypes,
      Result<any> | Promise<Result<any>>,
      ResultMatchHandler<any>,
    ];

    switch (action) {
      case Result.OK:
        return handleSuccess(handler, result) as any;
      case Result.NOT:
        return handleFailure(handler, result) as any;
      default:
        throw new Error(
          `The match type "${action}" is not valid!\n` +
            'Avoid using plain strings (prefer `Result.OK` or `Result.NOT`).',
        );
    }
  }

  #dataValue!: T;
  #errorValue!: E;
  #dataEvaluated = false;
  #errorEvaluated = false;

  constructor(
    private readonly dataOrFn: T | null | (() => T),
    private readonly errorOrFn: E | null | (() => E) = null,
  ) {}

  public get data(): T | null {
    if (this.dataOrFn === null) return null;
    if (!this.#dataEvaluated) {
      this.#dataValue =
        typeof this.dataOrFn === 'function'
          ? (this.dataOrFn as Function)()
          : this.dataOrFn;
      this.#dataEvaluated = true;
    }
    return this.#dataValue ?? null;
  }

  public get error(): E | null {
    if (this.errorOrFn === null) return null;
    if (!this.#errorEvaluated) {
      this.#errorValue =
        typeof this.errorOrFn === 'function'
          ? (this.errorOrFn as Function)()
          : this.errorOrFn;
      this.#errorEvaluated = true;
    }
    return this.#errorValue ?? null;
  }

  /**
   * Provides a default value if the result is a failure.
   * @template TValue The type of the default value.
   * @param value The default value or a function that returns it.
   * @returns The successful value or the default value.
   * @example
   * const result = Result.not(new Error('Missing value'));
   * const value = result.defaultValue(42);
   * console.log(value); // 42
   */
  public defaultValue<TValue = T>(
    value: TValue | ((data: T) => TValue),
  ): TValue {
    const getDefaultValue = () =>
      typeof value === 'function' ? (value as Function)(this.data) : value;

    return Result.isOk(this)
      ? (this.data as TValue) ?? getDefaultValue()
      : getDefaultValue();
  }

  /**
   * Extracts the value of the result, optionally transforming it if it is successful.
   * @template TValue The type of the transformed value.
   * @param mutator A function that transforms the value (optional).
   * @returns The transformed value, the original value, or `null` if the result is a failure.
   * @example
   * const result = Result.ok(42);
   * const transformed = result.value((data) => data * 2);
   * console.log(transformed); // 84
   *
   * const failureResult = Result.not(new Error('Something went wrong'));
   * const fallback = failureResult.value(() => 0);
   * console.log(fallback); // null
   */
  public value<TValue>(mutator: (data: T) => TValue): TValue;
  public value(): T;
  public value<TValue = T>(mutator?: (data: T) => TValue): TValue | T | null {
    return Result.isOk(this) && mutator ? mutator(this.data as T) : this.data;
  }

  /**
   * Transforms the successful value of the result.
   * @template TReturn The type of the transformed value.
   * @param mutator A function that transforms the value.
   * @returns A new result containing the transformed value.
   * @example
   * const result = Result.ok(42).to((data) => data * 2);
   * console.log(result.data); // 84
   */
  public to<TReturn>(mutator: (data: T) => TReturn): AnyResult<TReturn, E> {
    if (Result.notOk(this)) return this as unknown as AnyResult<TReturn, E>;
    return Result.ok(mutator(this.data as T));
  }

  public or<TReturn>(callback: (error: E) => TReturn): T | TReturn {
    return Result.isOk(this) ? (this.data as T) : callback(this.error as E);
  }

  /**
   * Transforms the successful value of the result if it is successful.
   * @template TReturn The type of the transformed value.
   * @template TReturn The type of the new successful value.
   * @param callback A function that transforms the successful value.
   * @returns A new result containing the transformed value or the original result if it is a failure.
   * @example
   * // Example 1: Transforming a successful result
   * const result = Result.ok(42);
   * const transformed = result.ok((data) => data * 2);
   * console.log(transformed.data); // 84
   *
   * // Example 2: Handling a failure result
   * const failureResult = Result.not(new Error('Something went wrong'));
   * const unchanged = failureResult.ok((data) => data * 2);
   * console.log(unchanged.error); // Error: Something went wrong
   *
   * // Example 3: Throwing an error during transformation
   * const resultWithError = Result.ok(42).ok((data) => {
   *   if (data > 40) throw new Error('Value too high');
   *   return data;
   * });
   * console.log(resultWithError.error); // Error: Value too high
   */
  public ok<TError = Error>(
    callback: (data: NonNullable<T>, result: Ok<T>) => void | never | undefined,
  ): AnyResult<T, TError | E>;
  public ok<TReturn, TError = E>(
    callback: (data: NonNullable<T>, result: Ok<T>) => TReturn,
  ): AnyResult<TReturn, TError>;
  public ok<TReturn, TError = Error>(
    callback: (data: NonNullable<T>, result: Ok<T>) => TReturn,
  ): AnyResult<NonNullable<TReturn>, TError | E> {
    try {
      if (Result.isOk(this)) {
        const result = callback(this.data as NonNullable<T>, this as Ok<T>);
        // If callback returns undefined/void, preserve the original value
        const finalValue = result === undefined ? this.data : result;
        return Result.ok(finalValue) as unknown as AnyResult<
          NonNullable<TReturn>,
          TError | E
        >;
      }
      return this as unknown as AnyResult<NonNullable<TReturn>, TError | E>;
    } catch (error) {
      return Result.not(error as TError) as unknown as AnyResult<
        NonNullable<TReturn>,
        TError | E
      >;
    }
  }

  /**
   * Transforms the error value of the result if it is a failure.
   * @template TReturn The type of the transformed error value.
   * @template TReturn The type of the new error value.
   * @param callback A function that transforms the error value.
   * @returns A new result containing the transformed error value or the original result if it is successful.
   * @example
   * const result = Result.not(new Error('Something went wrong'));
   * const transformed = result.not((error) => error.message);
   * console.log(transformed.error); // "Something went wrong"
   *
   * const successResult = Result.ok(42);
   * const unchanged = successResult.not((error) => 'This will not be called');
   * console.log(unchanged.data); // 42
   */

  public not<TData = T>(
    callback: (
      error: NonNullable<E>,
      result: Not<E>,
    ) => void | never | undefined,
  ): AnyResult<TData, E>;
  public not<TReturn, TData = T>(
    callback: (error: NonNullable<E>, result: Not<E>) => TReturn,
  ): AnyResult<TData, TReturn>;
  public not<TReturn, TData = T>(
    callback: (error: NonNullable<E>, result: Not<E>) => TReturn,
  ): AnyResult<TData, TReturn> {
    try {
      return Result.notOk(this)
        ? (Result.not(
            callback(this.error as NonNullable<E>, this as Not<E>) ??
              (this.error as E),
          ) as AnyResult<TData, TReturn>)
        : (this as unknown as AnyResult<TData, TReturn>);
    } catch (error) {
      return Result.not(error) as AnyResult<TData, TReturn>;
    }
  }

  /**
   * Throws the error if the result is a failure.
   * @throws The error contained in the result.
   * @example
   * const result = Result.not(new Error('Critical failure'));
   * result.throwIfNotOk(); // Throws: Error: Critical failure
   */
  public throwIfNotOk() {
    if (Result.notOk(this)) throw this.error;
  }
}

export { Result };
