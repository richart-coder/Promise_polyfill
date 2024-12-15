import Promise from "../promise.js";

describe("Promise Implementation", () => {
	describe("Basic Promise Functionality", () => {
		test("should create a new promise and resolve it", (done) => {
			const promise = new Promise((resolve) => {
				setTimeout(() => {
					resolve("success");
				}, 0);
			});

			promise.then((value) => {
				expect(value).toBe("success");
				done();
			});
		});

		test("should handle rejection", (done) => {
			const promise = new Promise((resolve, reject) => {
				setTimeout(() => {
					reject(new Error("failure"));
				}, 0);
			});

			promise.catch((error) => {
				expect(error.message).toBe("failure");
				done();
			});
		});

		test("should chain promises correctly", (done) => {
			const promise = Promise.resolve(1)
				.then((x) => x + 1)
				.then((x) => x * 2)
				.then((x) => {
					expect(x).toBe(4);
					done();
				});
		});
	});

	describe("Static Methods", () => {
		test("Promise.resolve should return a resolved promise", (done) => {
			Promise.resolve("direct").then((value) => {
				expect(value).toBe("direct");
				done();
			});
		});

		test("Promise.reject should return a rejected promise", (done) => {
			Promise.reject("error").catch((reason) => {
				expect(reason).toBe("error");
				done();
			});
		});

		test("Promise.all should resolve all promises", (done) => {
			const promises = [
				Promise.resolve(1),
				Promise.resolve(2),
				Promise.resolve(3),
			];

			Promise.all(promises).then((results) => {
				expect(results).toEqual([1, 2, 3]);
				done();
			});
		});

		test("Promise.race should resolve with the first settled promise", (done) => {
			const first = new Promise((resolve) =>
				setTimeout(() => resolve("first"), 0)
			);
			const second = new Promise((resolve) =>
				setTimeout(() => resolve("second"), 100)
			);

			Promise.race([first, second]).then((value) => {
				expect(value).toBe("first");
				done();
			});
		});

		test("Promise.any should resolve with the first fulfilled promise", (done) => {
			const promises = [
				Promise.reject("error1"),
				Promise.resolve("success"),
				Promise.reject("error2"),
			];

			Promise.any(promises).then((value) => {
				expect(value).toBe("success");
				done();
			});
		});

		test("Promise.allSettled should return status for all promises", (done) => {
			const promises = [Promise.resolve(1), Promise.reject("error")];

			Promise.allSettled(promises).then((results) => {
				expect(results).toEqual([
					{ status: "fulfilled", value: 1 },
					{ status: "rejected", reason: "error" },
				]);
				done();
			});
		});
	});

	describe("Error Handling", () => {
		test("should catch errors in promise chains", (done) => {
			Promise.resolve()
				.then(() => {
					throw new Error("chain error");
				})
				.catch((error) => {
					expect(error.message).toBe("chain error");
					done();
				});
		});

		test("finally should be called regardless of resolution", (done) => {
			let finallyCalled = false;

			Promise.resolve("success")
				.finally(() => {
					finallyCalled = true;
				})
				.then(() => {
					expect(finallyCalled).toBe(true);
					done();
				});
		});

		test("should handle nested promises", (done) => {
			const nestedPromise = Promise.resolve(
				Promise.resolve(Promise.resolve("nested"))
			);

			nestedPromise.then((value) => {
				expect(value).toBe("nested");
				done();
			});
		});
	});

	describe("Edge Cases", () => {
		test("should handle synchronous resolution", (done) => {
			const promise = new Promise((resolve) => resolve("sync"));
			promise.then((value) => {
				expect(value).toBe("sync");
				done();
			});
		});

		test("should ignore multiple resolves", (done) => {
			let callCount = 0;
			const promise = new Promise((resolve) => {
				resolve("first");
				resolve("second");
			});

			promise.then((value) => {
				callCount++;
				expect(value).toBe("first");
				expect(callCount).toBe(1);
				done();
			});
		});

		test("withResolvers should return promise with control functions", (done) => {
			const { promise, resolve, reject } = Promise.withResolvers();

			promise.then((value) => {
				expect(value).toBe("resolved");
				done();
			});

			resolve("resolved");
		});
	});
});
