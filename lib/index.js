'use strict';

const fs = require('fs');
const pathLib = require('path');

const parser = require('./parser');

const { BaseObject } = require('./types/object');
const { BaseArray } = require('./types/array');
const { BaseString } = require('./types/string');
const { BaseNumber } = require('./types/number');
const { BaseFunction } = require('./types/function');
const { BaseBoolean } = require('./types/boolean');

const CONT = Symbol('continue');

function run (str, path) {
    const lines = parser.parse(str);
    return runLines(lines, [], {}, false, path);
}

function get (value, pathArr, scope) {
    let out = value;
    for (let key of pathArr) {
        let resolvedKey = resolveValue(key, scope);
        if (out instanceof BaseObject && !(out[resolvedKey._value] instanceof Function)) {
            out = out.get(resolvedKey._value);
        } else if (out instanceof BaseArray && typeof resolvedKey._value === 'number') {
            out = out._value[resolvedKey._value];
        } else {
            try {
                out = out[resolvedKey._value];
                if (out === undefined)
                    out = null;
            } catch (e) {
                return null;
            }
        }
    }
    return out;
}

function runLines (lines, args, parent, inheritScope, path) {
    let scope;
    if (inheritScope)
        scope = parent;
    else {
        scope = new BaseObject();
        scope.parent = parent;
        scope.args = args;
        scope.argIndex = 0;
        scope.resolvedValues = new Map();
        scope.path = path || parent.path;
    }
    for (let line of lines) {
        if (line.type === 'comment') {
            continue;
        } else if (line.type === 'assignment') {
            if (line.variableName === null) {
                scope.flush(resolveValue(line.value, scope));
            } else if (line.path && line.path.length) {
                get(
                    line.variableName.valueType === 'ParentStatement' ? resolveValue(line.variableName, scope)._value : scope.get(resolveValue(line.variableName, scope)._value),
                    line.path.slice(0, -1),
                    scope
                ).set(
                    resolveValue(line.path[line.path.length - 1], scope)._value,
                    resolveValue(line.value, scope)
                );
            } else {
                scope.set(resolveValue(line.variableName, scope)._value, resolveValue(line.value, scope));
            }
        } else if (line.type === 'returnStatement') {
            return [ resolveValue(line.value, scope), scope ];
        } else if (line.type === 'ifStatement') {
            if (resolveValue(line.condition, scope).asBool()._value) {
                let [ returned ] = runLines(line.lines, null, scope, true);
                if (returned !== CONT)
                    return returned;
            }
        } else if (line.type === 'whileStatement') {
            while (resolveValue(line.condition, scope).asBool()._value) {
                let [ returned ] = runLines(line.lines, null, scope, true);
                if (returned !== CONT)
                    return returned;

            }
        } else {
            resolveValue(line, scope);
        }
    }
    return [ inheritScope ? CONT : scope.returnValue, scope ];
}

function resolveValue (spec, scope, thisVal=false) {
    if (spec.type === 'functionExecution') {
        return get(
            executeFunction(
                resolveValue(spec.args[0], scope, false),
                [ resolveValue(spec.subject, scope, false) ].concat(spec.args.slice(1).map(arg => resolveValue(arg, scope))),
                scope,
                resolveValue(spec.args[0], scope, true)
            ),
            thisVal ? (spec.path || []).slice(0, -1) : (spec.path || []),
            scope
        );
    } else if (spec.type === 'methodExecution') {
        return get(
            executeFunction(
                resolveValue(spec.subject, scope, false),
                spec.args.map(arg => resolveValue(arg, scope, false)),
                scope,
                resolveValue(spec.subject, scope, true)
            ),
            thisVal ? (spec.path || []).slice(0, -1) : (spec.path || []),
            scope
        );
    } else if (spec.type === 'LoadStatement') {
        return get(load(resolveValue(spec.value, scope, false), scope), thisVal ? (spec.path || []).slice(0, -1) : (spec.path || []), scope);
    } else if (spec.type === 'returningStatement') {
        scope.returnValue = resolveValue(spec.value, thisVal);
        return scope.returnValue;
    } else {
        return resolveValueType(spec, scope, thisVal);
    }
}

function load (path, scope) {
    if (['utils'].indexOf(path._toString()) !== -1) {
        var base = new BaseObject();
        var modules = require('./modules/' + path._toString());
        for (let [key, value] of Object.entries(modules)) {
            base.set(key, value);
        }
        return base;
    } else {
        const fullPath = pathLib.resolve(process.cwd(), pathLib.dirname(scope.path), path._toString());
        const content = fs.readFileSync(fullPath, 'utf8') || fs.readFileSync(fullPath + '.meth', 'utf8');
        if (content) {
            const [, loaded] = runLines(parser.parse(content), [], undefined, false, fullPath);
            return loaded;
        } else if (fs.existsSync(fullPath + '.js')) {
            const jsModule = require(fullPath + '.js');
            // need some general type translation code
        } else {
            throw new Error(`Couldn\'t find module under ${path._toString()}`);
        }
    }
}

function resolveValueType (spec, scope, thisVal=false) {
    const base = {
        'Boolean': () => new BaseBoolean(spec.value),
        'String': () => new BaseString(spec.value),
        'Number': () => new BaseNumber(spec.value),
        'variable': () => scope.get(resolveValue(spec.value)._value),
        'Function': () => new BaseFunction(spec, scope),
        'Object': () => {
            var o = new BaseObject();
            for (let entry of spec.value.entries()) {
                o.set(entry[0], resolveValue(entry[1], scope));
            }
            return o;
        },
        'Array': () => new BaseArray(spec.value.map(i => resolveValue(i, scope))),
        'ParentStatement': () => scope.parent,
        'Argument': () => {
            const resolved = scope.resolvedValues.get(spec);
            if (resolved)
                return resolved;
            let out;
            if (spec.argIndex !== null)
                out = scope.args[spec.argIndex];
            else
                out = scope.args[scope.argIndex++];
            
            if (out === undefined)
                out = resolveValue(spec.defaultValue);
            scope.resolvedValues.set(spec, out);
            return out;
        },
        'null': () => null,
    }[spec.valueType]();

    if (spec.path && spec.path.length)
        return get(base, thisVal ? spec.path.slice(0, -1) : spec.path, scope);
    return base;
}

function executeFunction (f, args, scope, thisVal) {
    if (f instanceof Function)
        return f.apply(thisVal || f, args);
    else if (f instanceof BaseFunction) {
        return runLines(f._lines, args, scope);
    } else {
        throw new Error('Unrecognised function type: ' + f);
    }
}

module.exports = {
    run,
    runLines
};
