import tape from "tape";
import { Result, ok, err, trycatch } from ".";

const TEST_ERROR = new Error("test error");

tape("Result", async (assert: tape.Test) => {
	assert.equal(Result.ok(1).isOk(), true);
	assert.equal(ok(1).isErr(), false);

	assert.equal(Result.err(TEST_ERROR).isOk(), false);
	assert.equal(err(TEST_ERROR).isErr(), true);

	assert.equal(ok(1).unwrap(), 1);
	assert.equal(
		ok(1)
			.map((x) => x + 1)
			.unwrap(),
		2,
	);
	assert.equal(
		ok(1)
			.mapOr((x) => x + 1, 1)
			.unwrap(),
		2,
	);
	assert.equal(
		err<number>(TEST_ERROR)
			.mapOr((x) => x + 1, 1)
			.unwrap(),
		1,
	);
	assert.equal(
		ok(1)
			.mapOrElse(
				(x) => x + 1,
				() => 1,
			)
			.unwrap(),
		2,
	);
	assert.equal(
		err<number>(TEST_ERROR)
			.mapOrElse(
				(x) => x + 1,
				() => 1,
			)
			.unwrap(),
		1,
	);
	assert.equal(
		err<number>(TEST_ERROR)
			.map((x) => x + 1)
			.isErr(),
		true,
	);

	assert.deepEqual(ok(1).flatMap(ok), ok(1));
	assert.deepEqual(err<number>(TEST_ERROR).flatMapOr(ok, ok(1)), ok(1));
	assert.deepEqual(
		err<number>(TEST_ERROR).flatMapOrElse(ok, () => ok(1)),
		ok(1),
	);

	assert.deepEqual(ok(1).and(ok(2)), ok(2));
	assert.deepEqual(err<number>(TEST_ERROR).and(ok(1)), err<number>(TEST_ERROR));

	assert.deepEqual(
		ok(1).andThen(() => ok(2)),
		ok(2),
	);
	assert.deepEqual(
		err(TEST_ERROR).andThen(() => ok(1)),
		err(TEST_ERROR),
	);

	assert.deepEqual(ok(1).or(ok(2)), ok(1));
	assert.deepEqual(err(TEST_ERROR).or(ok(1)), ok(1));

	assert.deepEqual(
		ok(1).orElse(() => ok(2)),
		ok(1),
	);
	assert.deepEqual(
		err(TEST_ERROR).orElse(() => ok(1)),
		ok(1),
	);

	assert.equal(
		err(TEST_ERROR).unwrapOrElse(() => 1),
		1,
	);

	assert.deepEqual(ok(2).okOrInsert(1), ok(2));
	assert.deepEqual(err(TEST_ERROR).okOrInsert(1), ok(1));
	assert.deepEqual(
		ok(2).okOrInsertWith(() => 1),
		ok(2),
	);
	assert.deepEqual(
		err(TEST_ERROR).okOrInsertWith(() => 1),
		ok(1),
	);

	assert.deepEqual(ok(0).replace(1), ok(1));
	assert.deepEqual(err(TEST_ERROR).replace(1), ok(1));

	assert.deepEqual(ok({}).toJS(), {});
	assert.throws(() => err(TEST_ERROR).toJS(), TEST_ERROR.message);
	assert.deepEqual(ok({}).toJSON(), {});
	assert.throws(() => err(TEST_ERROR).toJSON(), TEST_ERROR.message);

	let ifOkValue = 0;
	ok(1).ifOk((x) => {
		ifOkValue = x;
	});
	assert.equal(ifOkValue, 1);

	let ifElseCalled = false;
	err(TEST_ERROR).ifOk(
		() => undefined,
		() => {
			ifElseCalled = true;
		},
	);
	assert.equal(ifElseCalled, true);

	let ifErrCalled = false;
	err(TEST_ERROR).ifErr(() => {
		ifErrCalled = true;
	});
	assert.equal(ifErrCalled, true);

	let ifErrElseValue = 0;
	ok(1).ifErr(
		() => undefined,
		(x) => {
			ifErrElseValue = x;
		},
	);
	assert.equal(ifErrElseValue, 1);

	assert.throws(() => {
		err(TEST_ERROR).unwrap();
	}, TEST_ERROR.message);

	assert.throws(
		() => new Result({}, {}, {}),
		/Results can only be created with the ok or err functions/,
	);

	for (const value of ok("test")) {
		assert.equal(value, "test", "should loop over ok result");
	}
	let loopedOverErr = false;
	for (const _ of err(TEST_ERROR)) {
		loopedOverErr = true;
	}
	assert.equal(loopedOverErr, false, "should not loop over err result");

	assert.deepEqual(
		trycatch(() => true),
		ok(true),
	);
	assert.deepEqual(
		trycatch(() => {
			throw TEST_ERROR;
		}),
		err(TEST_ERROR),
	);

	assert.deepEqual(
		await trycatch(
			async () => new Promise<boolean>((resolve) => resolve(true)),
		),
		ok(true),
	);
	assert.deepEqual(
		await trycatch(
			() => new Promise<void>((_resolve, reject) => reject(TEST_ERROR)),
		),
		err(TEST_ERROR),
	);

	assert.deepEqual(
		await Result.try(new Promise<boolean>((resolve) => resolve(true))),
		ok(true),
	);
	assert.deepEqual(
		await Result.try(
			new Promise<void>((_resolve, reject) => reject(TEST_ERROR)),
		),
		err(TEST_ERROR),
	);

	assert.end();
});
