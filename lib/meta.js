const vm = require('vm');

module.exports = { read };
function read (code) {
	const sandbox = {
		Buffer,
		module: {exports: {}}
	};
	const ctx = vm.createContext(sandbox);
	vm.runInContext(code, ctx);
	return sandbox.module.exports;
};
