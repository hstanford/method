'use strict';

const { BaseBoolean } = require('./boolean');
const { BaseNumber } = require('./number');

class BaseString {
    constructor (value) {
        this._value = value;
        this.length = this._value.length;
    }
    add (other) {
        return new BaseString(this._value + other._value);
    }
    slice (from, to) {
        return new BaseString(this._value.slice(from._value, to._value));
    }
    equals (other) {
        let val;
        if (other instanceof BaseString) {
            val = (this._value === other._value);
        } else if (other.equals instanceof Function) {
            return other.equals(this);
        } else {
            val = false;
        }
        return new BaseBoolean(val);
    }
    asBool () {
        return this._toBoolean();
    }
    asNumber () {
        const test = parseFloat(this._value);
        if (Number.isNaN(test))
            return null;
        return new BaseNumber(test);
    }
    not() {
        return this.asBool().not();
    }
    _toString () {
        return this._value;
    }
    _toValue () {
        return this._value;
    }
    _toBoolean () {
        return new BaseBoolean(this._value.length > 0);
    }
}

module.exports = {
    BaseString,
};
