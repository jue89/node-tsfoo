module.exports.open = jest.fn((path, flags, cb) => cb(null, 1));
module.exports.write = jest.fn((fd, buffer, offset, len, pos, cb) => cb(null, len));
module.exports.close = jest.fn((fd, cb) => cb(null));
