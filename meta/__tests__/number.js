const number = require('../number.js');

test('convert numbers', () => {
	expect(number.type).toEqual('number');
	const packed = number.pack(Math.PI);
	expect(packed).toBeInstanceOf(Buffer);
	expect(packed.length).toBe(number.itemLen);
	const unpacked = number.unpack(packed);
	expect(unpacked).toBe(Math.PI);
});
