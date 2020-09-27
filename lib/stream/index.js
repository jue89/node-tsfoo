const {ReadStream} = require('./read.js');
const {WriteStream} = require('./write.js');

const createReadStream = (reader) => new ReadStream(reader);
const createWriteStream = (writer) => new WriteStream(writer);

module.exports = {createReadStream, createWriteStream};
