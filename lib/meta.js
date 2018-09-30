const vm = require('vm');

module.exports = { read };
function read (code) {
	const sandbox = {module: {exports: {}}};
	const ctx = vm.createContext(sandbox);
	vm.runInContext(code, ctx);
	return sandbox.module.exports;
};
