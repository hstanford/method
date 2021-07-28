'use strict';

module.exports = {
    log: function (...args) {
        console.log(...args.map(arg => {
            return arg && arg._toString ? arg._toString() : arg;
        }));
    },
};
