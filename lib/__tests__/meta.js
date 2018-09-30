const meta = require('../meta.js');

describe('meta.read', () => {
	const metaRead = meta.read;

	test('expose module.exports', () => {
		const meta = metaRead(`module.exports.foo = 'bar';`);
		expect(meta.foo).toEqual('bar');
	});
});
