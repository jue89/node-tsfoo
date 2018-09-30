module.exports.open = jest.fn((path, flags, cb) => cb(null, 1));
module.exports.write = jest.fn((fd, buffer, offset, length, position, cb) => cb(null, length, buffer));
module.exports.read = jest.fn((fd, buffer, offset, length, position, cb) => cb(null, length, buffer));
module.exports.stat = jest.fn((fd, cb) => cb(null, {}));
module.exports.close = jest.fn((fd, cb) => cb(null));
