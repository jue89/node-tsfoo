module.exports.open = jest.fn((path, flags, cb) => cb(null, 1));
module.exports.write = jest.fn((fd, buffer, cb) => cb(null, buffer.length));
module.exports.close = jest.fn((fd, cb) => cb(null));
