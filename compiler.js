'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var f = process.argv[2];

var rs = fs.createReadStream(path.join(process.cwd(), f), 'utf8');

rs.on('readable', () => {
    interpretProc(rs, {});
});


function interpretProc (rs, parentScope) {
    var scope = _.defaults({}, parentScope);
    var context = [];
    var currToken = '';
    var lastToken;
    for (let char = rs.read(1); char !== null; char = rs.read(1)) {
        if (char.match(/\w/))
            currToken += char;
        else {
            if (currToken)
                lastToken = currToken;
            currToken = '';
        }
        if (char === '<')
            interpretProc(rs, scope);
        if (char === '=' || char === ':')
            context.push({type: 'ASSIGNMENT', value: lastToken});
        if (char === '{')
            context.push({type: 'OBJECT', value: {}});
        if (char === '}')
            context = context.slice(0, _.findLastIndex(context, i => i.type === 'OBJECT'));
        if (char === '(')
            context.push({type: 'FUNCTION'});
        if (char === ')')
            context = context.slice(0, _.findLastIndex(context, i => i.type === 'FUNCTION'));
        if (char === ';') {
            _.each(context, (i, ind) => {
                if (i.type === 'ASSIGNMENT') {
                    if (!i.value)
                        scope = _.defaults({},)
                    else {
                        if (_.get(context[ind - 1], 'type') === 'OBJECT')
                            context[ind - 1].value[i.value] = 'PLACEHOLDER';
                        else
                            scope[i.value] = 'PLACEHOLDER';
                    }
                }
            });
            console.log('!!!!', scope, context);
            context = [];
        }
        if (char === '\'')
            context = context.indexOf('STRING') !== -1 ? context.slice(0, context.lastIndexOf('STRING')) : context.concat(['STRING']);
        console.log(char, currToken, context, scope);
    }
}
