const {reader, writer} = require('../series/index.js');
const {ReadStream} = require('./read.js');
const {WriteStream} = require('./write.js');

const createReadStream = (opts) => reader(opts).then((r) => new ReadStream(r));
const createWriteStream = (opts) => writer(opts).then((w) => new WriteStream(w));

module.exports = {createReadStream, createWriteStream};
