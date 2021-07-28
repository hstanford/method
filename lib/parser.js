'use strict';

const {
    regex,
    sequenceOf,
    char,
    digits,
    str,
    possibly,
    choice,
    everythingUntil,
    recursiveParser,
    coroutine,
    pipeParsers,
    skip,
    many,
    many1,
    endOfInput,
    whitespace,
} = require('arcsecond');

const _listParser = function* () {
    const values = [];
    let value;
    do {
        value = yield possibly(pipeParsers([
            value ? spacedComma : optionalContent,
            valueParser
        ]));
        value && values.push(value);
    } while (value);
    return values;
}

const commentParser = choice([
    regex(/^\/\/.*/),
    regex(/^\/\*[\s\S]*\*\//m),
]).map(comment => ({
    type: 'comment'
}));

const ignoredContent = choice([commentParser, whitespace]);
const optionalContent = many(ignoredContent);

const variableNameParser = regex(/^[a-zA-Z][a-zA-Z0-9]*/);
const variableParser = pipeParsers([
    char('.'),
    variableNameParser
]);

const optionalSpacedDot = possibly(pipeParsers([
    optionalContent,
    char('.'),
    skip(optionalContent),
]));


const argumentParser = coroutine(function* () {
    yield char('_');
    yield optionalContent;
    const argIndex = yield possibly(digits);
    yield optionalContent;
    yield possibly(char(','));
    yield optionalContent;
    const defaultValue = yield possibly(valueParser);
    yield optionalContent;
    yield char('_');
    return {
        valueType: 'Argument',
        defaultValue,
        argIndex,
    };
});

const singleQuote = char('\'');
// TODO: escaped single quotes
const stringParser = pipeParsers([
    singleQuote,
    everythingUntil(singleQuote),
    skip(singleQuote)
]).map(value => ({
    valueType: 'String',
    value
}));

const spacedComma = pipeParsers([
    optionalContent,
    char(','),
    skip(optionalContent)
]);

const arrayParser = coroutine(function* () {
    yield char('|');
    const values = yield* _listParser();
    yield char('|');
    return {
        valueType: 'Array',
        value: values
    };
});

const objectParser = coroutine(function* () {
    yield char('{');
    yield optionalContent;
    const out = new Map();
    let key, value;
    do {
        key = yield possibly(pipeParsers([
            optionalContent,
            key ? spacedComma : optionalContent,
            optionalContent,
            variableNameParser,
            skip(optionalContent),
            skip(char(':'))
        ]));
        if (key) {
            value = yield pipeParsers([
                optionalContent,
                valueParser,
                skip(optionalContent),
            ]);
            out.set(key, value);
        }
    } while (key);
    yield optionalContent;
    yield possibly(spacedComma);
    yield optionalContent;
    yield char('}');
    return {
        valueType: 'Object',
        value: out
    };
});

const numberParser = coroutine(function* () {
    const negative = yield possibly(char('-'));
    const pre = yield digits;
    const post = yield possibly(pipeParsers([
        char('.'),
        digits
    ]));

    return { valueType: 'Number', value: parseFloat((negative || '') + pre + (post ? '.' + post : '')) }
});

const booleanParser = choice([
    char('t'),
    char('f')
]).map(value => {
    valueType: 'Boolean',
    value
});

const baseValueParser = coroutine(function* () {
    let i = 0;
    while (yield possibly(char('('))) i++;
    const subject = yield choice([
        parentParser,
        loadParser,
        returnParser,
        returningParser,
        argumentParser,
        stringParser,
        arrayParser,
        objectParser,
        scopeParser,
        propertyParser.map(value => ({
            valueType: 'variable',
            value
        })),
        numberParser,
        booleanParser,
        str('null').map(_ => ({ valueType: 'null' }))
    ]).map(x => {
        x.type = x.type || 'value';
        return x;
    });
    for (let j = 0; j < i; j++) yield char(')');
    return subject;
});

const functionExecutionParser = coroutine(function* () {
    let subject = yield baseValueParser;

    let hasAtSymbol;

    subject.path = [];

    let prop;
    while (prop = yield possibly(propertyParser)) {
        subject.path.push( prop );
    }

    hasAtSymbol = yield possibly(char('@'));
    yield char('(');
    let args = yield* _listParser();
    yield char(')');

    subject = {
        type: hasAtSymbol ? 'functionExecution' : 'methodExecution',
        subject,
        args,
        path: []
    };

    while (prop = yield possibly(propertyParser)) {
        subject.path.push( prop );
    }

    const tryExecute = function* () {
        hasAtSymbol = yield possibly(char('@'));
        return yield possibly(char('('));
    };

    while (yield* tryExecute()) {
        args = yield* _listParser();
        yield char(')');

        subject = {
            type: hasAtSymbol ? 'functionExecution' : 'methodExecution',
            subject,
            args,
            path: []
        };
        
        while (prop = yield possibly(propertyParser)) {
            subject.path.push( prop );
        }
    }
    return subject;
});

const valueParser = coroutine(function* () {
    let subject = yield choice([
        functionExecutionParser,
        baseValueParser
    ]);

    subject.path = [];

    let prop;
    while (prop = yield possibly(propertyParser)) {
        subject.path.push( prop );
    }
    return subject;
});

const propertyParser = choice([
    pipeParsers([
        optionalContent,
        char('.'),
        optionalContent,
        variableNameParser,
        skip(optionalContent)
    ]).map(value => ({
        valueType: 'String',
        value
    })),
    pipeParsers([
        optionalContent,
        char('['),
        optionalContent,
        valueParser,
        skip(char(']')),
        skip(optionalContent)
    ])
]);


const loadParser = pipeParsers([
    str('load'),
    whitespace,
    valueParser
]).map(value => ({
    type: 'LoadStatement',
    value
}));

const returnParser = pipeParsers([
    str('return'),
    whitespace,
    valueParser
]).map(value => ({
    type: 'returnStatement',
    value
}));

const returningParser = pipeParsers([
    str('returning'),
    whitespace,
    valueParser
]).map(value => ({
    type: 'returningStatement',
    value
}));

const parentParser = str('parent').map(value => ({
    value,
    type: 'value',
    valueType: 'ParentStatement',
}));

const assignmentParser = coroutine(function* () {
    const subject = { type: 'assignment', path: [] };
    yield optionalContent;
    subject.variableName = yield possibly(propertyParser);
    if (!subject.variableName)
        subject.variableName = yield possibly(parentParser);
    let prop;
    while (prop = yield possibly(propertyParser)) {
        subject.path.push( prop );
    }
    yield optionalContent;
    yield char('=');
    yield optionalContent;
    subject.value = yield valueParser;
    return subject;
});

const ifParser = coroutine(function* () {
    yield str('if');
    yield optionalContent;
    const condition = yield valueParser;
    yield optionalContent;
    yield possibly(char(':'));
    yield optionalContent;
    const line = yield lineParser;
    return {
        type: 'ifStatement',
        condition,
        lines: [line]
    };
});

const whileParser = coroutine(function* () {
    yield str('while');
    yield optionalContent;
    const condition = yield valueParser;
    yield optionalContent;
    yield possibly(char(':'));
    yield optionalContent;
    const line = yield lineParser;
    return {
        type: 'whileStatement',
        condition,
        lines: [line]
    };
});

const lineParser = choice([
    ignoredContent.map(() => ({ type: 'comment' })),
    pipeParsers([
        assignmentParser,
        skip(char(';')),
        skip(optionalContent),
    ]),
    pipeParsers([
        valueParser,
        skip(char(';')),
        skip(optionalContent),
    ]),
    ifParser,
    whileParser,
]);

const functionParser = coroutine(function* () {
    const lines = [];
    let line;
    while (line = yield possibly(lineParser)) {
        lines.push(line);
        yield many(pipeParsers([
            optionalContent,
            char(';'),
        ]));
        yield optionalContent;
    }
    return {
        valueType: 'Function',
        lines
    }
});

const scopeParser = pipeParsers([
    char('<'),
    optionalContent,
    functionParser,
    skip(optionalContent),
    skip(char('>'))
]);

const moduleParser = coroutine(function* () {
    const out = yield functionParser;
    yield endOfInput;
    out.type = 'Module';
    return out;
});

if (require.main === module) {
    const fs = require('fs');
    const content = fs.readFileSync(process.argv[2], 'utf8');
    const parsed = JSON.stringify(moduleParser.run(content), (key, val) => {
        if (val instanceof Map) {
            const obj = Object.create(null);
            for (let [k,v] of val) { obj[k] = v }
            return obj;
        } else
            return val;
    });
    console.log(parsed);
}

module.exports = {
    parse: function (str) {
        const parsed = moduleParser.run(str);
        if (parsed.isError)
            throw new Error(parsed.error);
        return parsed.result.lines;
    }
};
