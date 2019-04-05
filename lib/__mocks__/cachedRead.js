module.exports = jest.fn();
module.exports.prototype.read = jest.fn((offset, len) => Promise.resolve(Buffer.alloc(len)));
