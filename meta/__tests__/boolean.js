const boolean = require('../boolean.js');

test('convert true', () => {
	expect(boolean.type).toEqual('boolean');
	const packed = boolean.pack(true);
	expect(packed).toBeInstanceOf(Buffer);
	expect(packed.length).toBe(boolean.itemLen);
	const unpacked = boolean.unpack(packed);
	expect(unpacked).toBe(true);
});

test('convert false', () => {
	const packed = boolean.pack(false);
	const unpacked = boolean.unpack(packed);
	expect(unpacked).toBe(false);
});
