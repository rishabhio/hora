const promisesAplusTests = require('promises-aplus-tests')
const Hora = require('../lib/hora');

class Adapter {
    static resolved(value) {
        return new Hora(function(resolve) {
            resolve(value);
        });
    }
    static rejected(reason) {
        return new Hora(function(resolve, reject) {
            reject(reason);
        });
    }
    static deferred() {
        let resolve, reject;

        return {
            promise: new Hora((rslv, rjct) => {
                resolve = rslv;
                reject = rjct;
            }),
            resolve: resolve,
            reject: reject
        };
    }
}

module.exports = Adapter;