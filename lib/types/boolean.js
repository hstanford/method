'use strict';

class BaseBoolean {
    constructor (value) {
        this._value = value;
    }
    asBool () {
        return this;
    }
    not () {
        return new BaseBoolean(!this._value);
    }
    or (other) {
        return new BaseBoolean(this._value || other._value);
    }
    and (other) {
        return new BaseBoolean(this._value && other._value);
    }
    equals (other) {
        let val;
        if (other instanceof BaseBoolean) {
            val = (this._value === other._value);
        } else {
            val = false;
        }
        return new BaseBoolean(val);
    }
    _toString () {
        return this._value ? 't' : 'f';
    }
    _toValue () {
        return this._value;
    }
}

module.exports = {
    BaseBoolean,
};
