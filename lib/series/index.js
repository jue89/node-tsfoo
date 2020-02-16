const {open} = require('../fsbackend/index.js');
const {readerFactory} = require('./reader.js');
const {writerFactory} = require('./writer.js');

const reader = readerFactory(open, Date.now);
const writer = writerFactory(open, Date.now);

module.exports = {reader, writer};
