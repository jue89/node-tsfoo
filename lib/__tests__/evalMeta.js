const evalMeta = require('../evalMeta.js');

test('expose module.exports', () => {
	const meta = evalMeta(`module.exports.foo = 'bar';`);
	expect(meta.foo).toEqual('bar');
});
