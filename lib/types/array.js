'use strict';

const { BaseNumber } = require('./number');
const { BaseBoolean } = require('./boolean');

class BaseArray {
    constructor (value) {
        this._value = value;
        this.length = new BaseNumber(this._value.length);
    }
    push (value) {
        this._value.push(value);
        this.length = new BaseNumber(this._value.length);
        return this;
    }
    concat (other) {
        if (other instanceof BaseArray)
            return new BaseArray(this._value.concat(other._value));

        this.push(other);
        return this;
    }
    asBool () {
        return this._toBoolean();
    }
    not () {
        return this.asBool().not();
    }
    each (fn) {
        for (let i = 0; i < this._value.length; i++) {
            fn._call([this._value[i], new BaseNumber(i)]);
        }
    }
    map (fn) {
        const out = new BaseArray([]);
        for (let i = 0; i < this._value.length; i++) {
            out.push(fn._call([this._value[i], new BaseNumber(i)]));
        }
        return out;
    }
    equals (other) {
        let val;
        if (other instanceof BaseArray)
            val = (this === other);
        else
            val = false;

        return new BaseBoolean(val);
    }
    _toJSON (asJSON=true) {
        return JSON.stringify(this._value, function (key, value) {
            if (value._toValue)
                return value._toValue(asJSON);
            else
                return value;
        });
    }
    _toString () {
        return this._toJSON(false).replace(/^\[/, '|').replace(/\]$/, '|');
    }
    _toValue (asJSON) {
        //return asJSON ? this._toJSON() : this._toString();
        return this._value;
    }
    _toBoolean () {
        return new BaseBoolean(this._value.length > 0);
    }
}

module.exports = {
    BaseArray,
};
