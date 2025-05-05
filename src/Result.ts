type CreateSecret = unknown;
type OkSecret = unknown;
type ErrSecret = unknown;

const CREATE_SECRET: CreateSecret = {};
const OK_SECRET: OkSecret = {};
const ERR_SECRET: ErrSecret = {};

export class Result<T, E = Error> implements Iterable<T> {
	static ok<T, E = Error>(value: T): Result<T, E> {
		return ok(value);
	}
	static err<T, E = Error>(error: E): Result<T, E> {
		return err(error);
	}
	static trycatch<T, E = Error>(fn: () => (Promise<T> | T)): Promise<Result<T, E>> | Result<T, E> {
		return trycatch(fn);
	}

	private _value: T | ErrSecret = OK_SECRET;
	private _error: E | ErrSecret = ERR_SECRET;

	constructor(createSecret: CreateSecret, value: T | OkSecret, error: E | ErrSecret) {
		if (createSecret !== CREATE_SECRET) {
			throw new TypeError(
				"Results can only be created with the ok or err functions",
			);
		}
		this._value = value;
		this._error = error;
	}

	isErr(): boolean {
		return this._value === OK_SECRET && this._error !== ERR_SECRET;
	}

	isOk(): boolean {
		return this._value !== OK_SECRET && this._error === ERR_SECRET;
	}

	expect(): T {
		if (this.isOk()) {
			return this._value as T;
		}
		throw this._error;
	}

	unwrap(): T {
		return this.expect();
	}
	unwrapOr(def: T): T {
		if (this.isOk()) {
			return this._value as T;
		}
		return def;
	}
	unwrapOrElse(defFn: () => T): T {
		if (this.isOk()) {
			return this._value as T;
		}
		return defFn();
	}

	map<U>(fn: (value: T) => U): Result<U, E> {
		if (this.isOk()) {
			return ok(fn(this._value as T));
		}
		return err<U, E>(this._error as E);
	}
	mapOr<U>(fn: (value: T) => U, def: U): Result<U, E> {
		if (this.isOk()) {
			return ok(fn(this._value as T));
		}
		return ok(def);
	}
	mapOrElse<U>(fn: (value: T) => U, defFn: () => U): Result<U, E> {
		if (this.isOk()) {
			return ok(fn(this._value as T));
		}
		return ok(defFn());
	}

	flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		if (this.isOk()) {
			return fn(this._value as T);
		}
		return err<U, E>(this._error as E);
	}
	flatMapOr<U>(fn: (value: T) => Result<U, E>, def: Result<U, E>): Result<U, E> {
		if (this.isOk()) {
			return fn(this._value as T);
		}
		return def;
	}
	flatMapOrElse<U>(
		fn: (value: T) => Result<U, E>,
		defFn: () => Result<U, E>,
	): Result<U, E> {
		if (this.isOk()) {
			return fn(this._value as T);
		}
		return defFn();
	}

	and<U>(value: Result<U, E>): Result<U, E> {
		if (this.isOk()) {
			return value;
		}
		return err<U, E>(this._error as E);
	}
	andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		if (this.isOk()) {
			return fn(this._value as T);
		}
		return err<U, E>(this._error as E);
	}

	or(value: Result<T, E>): Result<T, E> {
		if (this.isErr()) {
			return value;
		}
		return this;
	}
	orElse(fn: () => Result<T, E>): Result<T, E> {
		if (this.isErr()) {
			return fn();
		}
		return this;
	}

	okOrInsert(value: T): Result<T, E> {
		if (this.isErr()) {
			this._value = value;
			this._error = ERR_SECRET;
		}
		return this;
	}
	okOrInsertWith(fn: () => T): Result<T, E> {
		if (this.isErr()) {
			this._value = fn();
			this._error = ERR_SECRET;
		}
		return this;
	}

	replace(value: T): Result<T, E> {
		this._value = value;
		this._error = ERR_SECRET;
		return this;
	}
	replaceErr(error: E): Result<T, E> {
		this._value = OK_SECRET;
		this._error = error;
		return this;
	}

	ifOk(fn: (value: T) => void, elseFn?: (error: E) => void): Result<T, E> {
		if (this.isOk()) {
			fn(this._value as T);
		} else if (elseFn) {
			elseFn(this._error as E);
		}
		return this;
	}
	ifErr(fn: (error: E) => void, elseFn?: (value: T) => void): Result<T, E> {
		if (this.isErr()) {
			fn(this._error as E);
		} else if (elseFn) {
			elseFn(this._value as T);
		}
		return this;
	}

	toJSON(): T {
		return this.unwrap();
	}
	toJS(): T {
		return this.unwrap();
	}

	[Symbol.iterator](): ResultIterator<T> {
		return new ResultIterator(this._value);
	}
}

class ResultIterator<T> implements Iterator<T> {
	private value: T | OkSecret;

	constructor(value: T | OkSecret) {
		this.value = value;
	}

	next(): IteratorResult<T, undefined> {
		if (this.value === OK_SECRET) {
			return { done: true, value: undefined };
		}
		const value = this.value as T;
		this.value = OK_SECRET;
		return { done: false, value };
	}
}

export function ok<T, E = Error>(value: T): Result<T, E> {
	return new Result(CREATE_SECRET, value, ERR_SECRET);
}
export function err<T, E = Error>(error: E): Result<T, E> { return new Result(CREATE_SECRET, OK_SECRET, error); }
export function trycatch<T, E = Error>(fn: () => (Promise<T> | T)): Promise<Result<T, E>> | Result<T, E> {
	try {
		const result = fn();
		if (isPromiseLike(result)) {
			let promise = result.then(ok);
			if (typeof result.catch === 'function') {
				promise = promise.catch(err) as never;
			}
			return promise as Promise<Result<T, E>>;
		}
		return ok(result);
	} catch (error) {
		return err(error as E);
	}
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		typeof value === 'object' &&
		value !== null &&
		// biome-ignore lint/suspicious/noExplicitAny: check then function
		typeof (value as any).then === 'function'
	);
}