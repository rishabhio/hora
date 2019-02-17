const STATES = {
    PENDING: 0,
    FULFILLED: 1,
    REJECTED: 2
};

const Utils = {
    runAsync: function(fn) {
        process.nextTick(fn);
    },
    isFunction: function(val) {
        return typeof val === "function";
    },
    isObject: function(val) {
        if (val)
            return typeof val === "object";
        return false;
    },
    isPromise: function(val) {
        if (val)
            return val.constructor === Hora;
        return false;
    },
    isValidState: (state) => {
        return ((state === STATES.PENDING) ||
            (state === STATES.REJECTED) ||
            (state === STATES.FULFILLED));
    }
};


const runPRP = (promise, x) => {
    if (promise === x) {
        promise.changeState(STATES.REJECTED, new TypeError("Identity ERror"));
    } else if (Utils.isPromise(x)) {
        if (x.state === STATES.PENDING) {
            x.then(function(val) {
                runPRP(promise, val);
            }, function(reason) {
                promise.changeState(STATES.REJECTED, reason);
            });
        } else {
            promise.changeState(x.state, x.value);
        }
    } else if (Utils.isObject(x) || Utils.isFunction(x)) {
        let called = false;
        var thenHandler;
        try {
            thenHandler = x.then;

            if (Utils.isFunction(thenHandler)) {
                thenHandler.call(x,
                    function(y) {
                        if (!called) {
                            runPRP(promise, y);
                            called = true;
                        }
                    },
                    function(r) {
                        if (!called) {
                            promise.reject(r);
                            called = true;
                        }
                    });
            } else {
                promise.fulfill(x);
                called = true;
            }
        } catch (e) {
            if (!called) {
                promise.reject(e);
                called = true;
            }
        }
    } else {
        promise.fulfill(x);
    }
}


class Hora {
    constructor(fn) {
        const self = this;

        this.value = null;
        this.state = STATES.PENDING;
        this.queue = [];
        this.handlers = {
            fulfill: null,
            reject: null
        };

        if (fn) {
            fn(function(value) {
                runPRP(self, value);
            }, function(reason) {
                self.reject(reason);
            });
        }
    }

    changeState(state, value) {
        if (this.state === state ||
            this.state !== STATES.PENDING ||
            !Utils.isValidState(state) ||
            arguments.length !== 2) {
            return;
        }

        this.value = value;
        this.state = state;
        this.executeChain();
    }

    executeChain() {
        const that = this,
            fulfillFallBack = function(value) {
                return value;
            },
            rejectFallBack = function(reason) {
                throw reason;
            };

        if (this.state === STATES.PENDING) {
            return;
        }

        Utils.runAsync(function() {
            while (that.queue.length) {
                const queuedPromise = that.queue.shift();
                let handler = null,
                    value;

                if (that.state === STATES.FULFILLED) {
                    handler = queuedPromise.handlers.fulfill || fulfillFallBack;
                } else if (that.state === STATES.REJECTED) {
                    handler = queuedPromise.handlers.reject || rejectFallBack;
                }

                try {
                    value = handler(that.value);
                } catch (e) {
                    queuedPromise.changeState(STATES.REJECTED, e);
                    continue;
                }

                runPRP(queuedPromise, value);
            }
        });
    };
    reject(reason) {
        this.changeState(STATES.REJECTED, reason);
    }
    fulfill(value) {
        this.changeState(STATES.FULFILLED, value);
    }
    then(onFulfilled, onRejected) {
        const queuedPromise = new Hora();
        if (Utils.isFunction(onFulfilled)) {
            queuedPromise.handlers.fulfill = onFulfilled;
        }

        if (Utils.isFunction(onRejected)) {
            queuedPromise.handlers.reject = onRejected;
        }

        this.queue.push(queuedPromise);
        this.executeChain();

        return queuedPromise;
    };
}


module.exports = Hora;