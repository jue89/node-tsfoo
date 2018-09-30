const header = require('../header.js');

const MAGIC = Buffer.from('TSF1');

describe('header.read', () => {
	const headerRead = header.read;

	test('enforce right length', () => {
		try {
			headerRead(MAGIC);
			throw new Error('FAILED!');
		} catch (e) {
			expect(e.message).toEqual('Header is too short');
		}
	});

	test('enforce magic', () => {
		try {
			headerRead(Buffer.concat([
				Buffer.from('abcd'),
				Buffer.alloc(4 * 4)
			]));
			throw new Error('FAILED!');
		} catch (e) {
			expect(e.message).toEqual('Header Magic not found: 0x61626364 != 0x54534631');
		}
	});

	test('read header data', () => {
		const OFFSETS = Buffer.alloc(4 + 4 + 4 + 4);
		const metaStart = 0x42;
		const metaEnd = 0x55;
		const dataStart = 0xfff;
		const itemLen = 0xf;
		OFFSETS.writeUInt32LE(metaStart, 0);
		OFFSETS.writeUInt32LE(metaEnd, 4);
		OFFSETS.writeUInt32LE(dataStart, 8);
		OFFSETS.writeUInt32LE(itemLen, 12);
		const hdr = headerRead(Buffer.concat([MAGIC, OFFSETS]));
		expect(hdr).toMatchObject({metaStart, metaEnd, dataStart, itemLen});
	});
});
