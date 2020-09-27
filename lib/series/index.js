const {open} = require('../fsbackend/index.js');
const {readerFactory} = require('./reader.js');
const {writerFactory} = require('./writer.js');

const createReader = readerFactory(open, Date.now);
const createWriter = writerFactory(open, Date.now);

module.exports = {createReader, createWriter};
