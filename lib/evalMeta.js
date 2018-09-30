const vm = require('vm');

module.exports = loadMeta;
function loadMeta (code) {
	const sandbox = {module: {exports: {}}};
	const ctx = vm.createContext(sandbox);
	vm.runInContext(code, ctx);
	return sandbox.module.exports;
};
