const boolean = require('../extended-boolean.js');

test('convert true', () => {
	expect(boolean.type).toEqual('extended-boolean');
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

test('convert null', () => {
	const packed = boolean.pack(null);
	const unpacked = boolean.unpack(packed);
	expect(unpacked).toBe(null);
});

test('convert undefined', () => {
	const packed = boolean.pack(undefined);
	const unpacked = boolean.unpack(packed);
	expect(unpacked).toBe(undefined);
});
