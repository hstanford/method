'use strict';

const { BaseBoolean } = require('./boolean');
const { BaseString } = require('./string');
const { BaseArray } = require('./array');

class BaseObject {
    constructor () {
        this._value = new Map(...arguments);
    }
    * genEntries () {
        yield* this._value.entries();
    }
    entries () {
        return [...this.genEntries()];
    }
    flush (other) {
        this.clear();
        return this.setFrom(other);
    }
    clear () {
        this._value.clear();
    }
    setFrom (other) {
        for (let entry of other.genEntries()) {
            this.set(entry[0], entry[1]);
        }
        return this;
    }
    extend (other) {
        const out = new BaseObject();
        out.setFrom(this).setFrom(other);
        return out;
    }
    set (key, value) {
        return this._value.set(key, value);
    }
    get (key) {
        return this._value.get(key);
    }
    asBool () {
        return this._toBoolean();
    }
    not () {
        return this.asBool().not();
    }
    equals (other) {
        let val;
        if (other instanceof BaseObject)
            val = (this === other);
        else
            val = false;

        return new BaseBoolean(val);
    }
    each (fn) {
        for (let [key, value] of this.genEntries()) {
            fn._call([value, new BaseString(key)]);
        }
    }
    map (fn) {
        const out = new BaseArray([]);
        for (let [key, value] of this.genEntries()) {
            out.push(fn._call([value, new BaseString(key)]));
        }
        return out;
    }
    _toJSON (asJSON=true) {
        return JSON.stringify(this._toValue(), function (key, value) {
            if (value._toValue)
                return value._toValue(asJSON);
            else
                return value;
        });
    }
    _toString () {
        return this._toJSON(false);
    }
    _toValue () {
        const obj = Object.create(null);
        for (let [k,v] of this.genEntries()) { obj[k] = v }
        return obj;
    }
    _toBoolean () {
        const iter = this.genEntries();
        // check there's at least one entry
        return new BaseBoolean(!iter.next().done);
    }
}

module.exports = {
    BaseObject,
};
