const {EventEmitter} = require('events');

module.exports.constants = {F_OK: true};
module.exports.open = jest.fn((path, flags, cb) => cb(null, 1));
module.exports.stat = jest.fn((path, cb) => cb(null, {size: 0}));
module.exports.watchFile = jest.fn();
module.exports.watch = jest.fn(() => {
	const w = new EventEmitter();
	w.close = jest.fn(() => w.emit('close'));
	return w;
});
module.exports.unwatchFile = jest.fn();
module.exports.access = jest.fn((f, m, cb) => cb(null));
module.exports.read = jest.fn((f, b, o, l, p, cb) => cb(null, b.length, b));
module.exports.write = jest.fn((f, b, o, l, p, cb) => cb(null, b.length, b));
module.exports.close = jest.fn((fd, cb) => cb(null));
module.exports.fsync = jest.fn((fd, cb) => cb(null));
module.exports._readdir = jest.fn(() => []);
module.exports.readdir = jest.fn((_, cb) => cb(null, module.exports._readdir()));
