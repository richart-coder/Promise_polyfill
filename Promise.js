import AggregateError from "./AggregateError.js";
import { rawType } from "./utils/index.js";

class PromiseRejectionEvent extends Event {
  constructor(type, eventInit) {
    super(type, eventInit);
    this.reason = eventInit.detail.reason;
  }
}
const flat = (promise, resolve, reject) => {
  promise.then(resolve, reject);
};
/** @typedef { 'pending' | 'fulfilled' | 'rejected' } PromiseState */
/** @typedef {(value: any) => void} Resolve */
/** @typedef {(reason: any) => void} Reject */

/**
 * @callback ExecutorCallback
 * @param { Resolve } resolve
 * @param { Reject } reject
 * @returns { void }
 */
/**
 * @param {ExecutorCallback} executor
 */
export default class Promise {
  /** @type {PromiseState} */
  #PromiseState = "pending";
  #PromiseResult;
  #microtaskQueued = false;

  /** @returns { Resolvers } */
  static withResolvers() {
    /**
     * @typedef {Object} Resolvers
     * @property {Promise} promise - The promise object.
     * @property {Resolve} resolve - Function to resolve the promise.
     * @property {Reject} reject - Function to reject the promise.
     */

    let resolvers = {};
    const promise = new Promise((resolve, reject) => {
      resolvers = {
        resolve,
        reject,
      };
    });

    return {
      promise,
      resolve: resolvers.resolve,
      reject: resolvers.reject,
    };
  }

  static resolve(value) {
    return rawType(value) === "Promise"
      ? value
      : new Promise((resolve) => {
          resolve(value);
        });
  }

  static reject(reason) {
    return new Promise((resolve, reject) => {
      rawType(reason) === "Promise"
        ? flat(reason, resolve, reject)
        : reject(reason);
    });
  }

  static all(values) {
    const results = [];
    return new Promise((resolve, reject) => {
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        Promise.resolve(value).then((result) => {
          results[i] = result;
          if (results.length === values.length) resolve(results);
        }, reject);
      }
    });
  }
  static any(values) {
    const error = new AggregateError();
    return new Promise((resolve, reject) => {
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        Promise.resolve(value).then(
          (result) => {
            resolve(result);
          },
          (reason) => {
            error.add(reason);
            if (error.reasons.length === values.length)
              reject(`${AggregateError.name}: All promises were rejected`);
          }
        );
      }
    });
  }
  static allSettled(values) {
    const resolveHandler = (value) => ({ status: "fulfilled", value });
    const rejectHandler = (reason) => ({ status: "rejected", reason });

    const convertedPromises = values.map((v) =>
      Promise.resolve(v).then(resolveHandler, rejectHandler)
    );
    return Promise.all(convertedPromises);
  }
  static race(values) {
    return new Promise((resolve, reject) => {
      for (const value of values) {
        Promise.resolve(value).then((result) => {
          resolve(result);
        }, reject);
      }
    });
  }
  constructor(executor) {
    const settle = (state, value) => {
      this.#PromiseState = state;
      this.#PromiseResult = value;
    };
    /** @type { Resolve } */
    const resolve = (value) => {
      if (this.#PromiseState !== "pending") return;

      if (rawType(value) === "Promise") {
        value.then((result) => {
          settle("fulfilled", result);
          queueMicrotask(() => this.microtask?.());
        });
      } else {
        settle("fulfilled", value);
        queueMicrotask(() => this.microtask?.());
      }
    };

    /** @type { Reject } */
    const reject = (reason) => {
      if (this.#PromiseState !== "pending") return;
      this.#PromiseState = "rejected";
      this.#PromiseResult = reason;

      queueMicrotask(() => {
        if (this.#microtaskQueued) return;
        if (this.microtask) return this.microtask();

        const e = new PromiseRejectionEvent("unhandledrejection", {
          cancelable: true,
          detail: { reason },
        });
        queueMicrotask(() => {
          if (window.dispatchEvent(e)) {
            console.error(`Uncaught (in promise) ${e.reason}`);
          }
        });
      });
    };
    executor(resolve, reject);
  }

  /**
   * @param { (result: any) => any } [onFulfilled]
   * @param { (reason: any) => any } [onRejected]
   * @returns { Promise }
   */
  then(
    onFulfilled = (value) => value,
    onRejected = (reason) => {
      throw reason;
    }
  ) {
    return new Promise((resolve, reject) => {
      const microtask = () => {
        try {
          const result =
            this.#PromiseState === "fulfilled"
              ? onFulfilled(this.#PromiseResult)
              : onRejected(this.#PromiseResult);

          rawType(result) === "Promise"
            ? flat(result, resolve)
            : resolve(result);
        } catch (reason) {
          rawType(reason) === "Promise"
            ? flat(reason, resolve, reject)
            : reject(reason);
        }
      };

      if (this.#PromiseState !== "pending") {
        queueMicrotask(microtask);
        this.#microtaskQueued = true;
      } else {
        this.microtask = microtask;
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    return new Promise((resolve, reject) => {
      this.microtask = () => {
        try {
          onFinally();
          if (this.#PromiseState === "rejected") throw this.#PromiseResult;
          resolve(this.#PromiseResult);
        } catch (reason) {
          rawType(reason) === "Promise" ? flat(reason, reject) : reject(reason);
        }
      };
    });
  }
  get [Symbol.toStringTag]() {
    return "Promise";
  }
}
