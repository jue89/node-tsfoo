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
		const tsLen = 0x8;
		const itemLen = 0xf;
		OFFSETS.writeUInt32LE(metaStart, 0);
		OFFSETS.writeUInt32LE(metaEnd, 4);
		OFFSETS.writeUInt32LE(dataStart, 8);
		OFFSETS.writeUInt16LE(tsLen, 12);
		OFFSETS.writeUInt16LE(itemLen, 14);
		const hdr = headerRead(Buffer.concat([MAGIC, OFFSETS]));
		expect(hdr).toMatchObject({metaStart, metaEnd, dataStart, tsLen, itemLen});
	});
});

describe('header.gen', () => {
	const headerGen = header.gen;

	test('expect itemLen to be set', () => {
		try {
			headerGen({metaCode: 'abc'});
			throw new Error('FAILED!');
		} catch (e) {
			expect(e.message).toEqual('itemLen must be set');
		}
	});

	test('expect metaCode to be set', () => {
		try {
			headerGen({itemLen: 0});
			throw new Error('FAILED!');
		} catch (e) {
			expect(e.message).toEqual('metaCode must be set');
		}
	});

	test('generate header', () => {
		const metaCode = 'abcdef';
		const metaStart = 20;
		const metaEnd = metaStart + metaCode.length;
		const dataStart = metaEnd;
		const itemLen = 12;
		const tsLen = 8;
		const header = headerGen({metaCode, itemLen: 12});
		expect(header).toMatchObject({metaStart, metaEnd, dataStart, tsLen, itemLen});
		expect(header.data.slice(0, 4).toString('hex')).toEqual(MAGIC.toString('hex'));
		expect(header.data.readUInt32LE(4)).toBe(metaStart);
		expect(header.data.readUInt32LE(8)).toBe(metaEnd);
		expect(header.data.readUInt32LE(12)).toBe(dataStart);
		expect(header.data.readUInt16LE(16)).toBe(tsLen);
		expect(header.data.readUInt16LE(18)).toBe(itemLen);
	});
});
