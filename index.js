'use strict';

const fs = require('fs');
const path = require('path');

const parser = require('./lib/parser');
const { runLines } = require('./lib/index');
const { BaseString } = require('./lib/types/string');

const content = fs.readFileSync(process.argv[2], 'utf8');
const [ out ] = runLines(
    parser.parse(content),
    process.argv.slice(3).map(arg => new BaseString(arg)),
    undefined,
    false,
    path.resolve(process.argv[2])
);

if (out !== undefined)
    process.stdout.write(out._toString() + '\n');
