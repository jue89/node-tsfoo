const {open} = require('../fsbackend/index.js');
const {readerFactory} = require('./reader.js');
const {writerFactory} = require('./writer.js');

const reader = readerFactory(open);
const writer = writerFactory(open);

module.exports = {reader, writer};
