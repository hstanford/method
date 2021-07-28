'use strict';

const { BaseBoolean } = require('./boolean');

class BaseNumber {
    constructor (value) {
        this._value = value;
    }
    add (other) {
        return new BaseNumber(this._value + other._value);
    }
    plus (other) {
        return this.add(other);
    }
    minus (other) {
        return new BaseNumber(this._value - other._value);
    }
    divide (other) {
        return new BaseNumber(this._value / other._value);
    }
    times (other) {
        return new BaseNumber(this._value * other._value);
    }
    multiply (other) {
        return this.times(other);
    }
    equals (other) {
        let val;
        if (other instanceof BaseNumber)
            val = (this._value === other._value);
        else {
            val = this._toString() === other._toString();
        }
        return new BaseBoolean(val);
    }
    gt (other) {
        return new BaseBoolean(this._value > other._value);
    }
    gte (other) {
        return new BaseBoolean(this._value >= other._value);
    }
    lt (other) {
        return new BaseBoolean(this._value < other._value);
    }
    lte (other) {
        return new BaseBoolean(this._value <= other._value);
    }
    asBool () {
        return this._toBoolean();
    }
    not() {
        return this.asBool().not();
    }
    _toString () {
        return this._value.toString();
    }
    _toValue () {
        return this._value;
    }
    _toBoolean () {
        return new BaseBoolean(this._value > 0);
    }
}

module.exports = {
    BaseNumber,
};
