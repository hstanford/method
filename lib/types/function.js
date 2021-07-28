'use strict';

const { BaseObject } = require('./object');
const { BaseBoolean } = require('./boolean');

class BaseFunction extends BaseObject {
    constructor (spec, scope) {
        super();
        this._lines = spec.lines;
        this._parent = scope;
    }
    asBool () {
        return this._toBoolean();
    }
    not() {
        return this.asBool().not();
    }
    equals(other) {
        let val;
        if (other instanceof BaseFunction) {
            val = (this === other);
        } else {
            val = false;
        }
        return new BaseBoolean(val);
    }
    _call (args) {
        return require('../index').runLines(this._lines, args, this._parent);
    }
    _toString () {
        return '[Function]';
    }
    _toValue () {
        return this._toString();
    }
    _toBoolean () {
        return new BaseBoolean(true);
    }
}

module.exports = {
    BaseFunction,
};
