const {BlockReader} = require('../blockReader.js');

describe('BlockReader', () => {
	test('check minimum file size', () => {
		const offset = 4;
		const file = {size: offset - 1};
		expect(() => new BlockReader({file, offset})).toThrow('File too short');
	});

	test('get size', () => {
		const offset = 4;
		const blockSize = 2;
		const file = {size: offset};
		const br = new BlockReader({file, offset, blockSize});
		expect(br.size).toBe(0);
		file.size = offset + blockSize;
		expect(br.size).toBe(1);
		file.size = offset + blockSize * 1.5;
		expect(br.size).toBe(1);
		file.size = offset + blockSize * 2;
		expect(br.size).toBe(2);
	});
});

describe('BlockReader::readBlock', () => {
	test('read blocks', async () => {
		const offset = 4;
		const blockSize = 2;
		const file = {size: offset + 2 * blockSize, cachedRead: jest.fn(({size}) => Buffer.alloc(size))};
		const br = new BlockReader({file, offset, blockSize});
		expect((await br.readBlock(0)).length).toBe(blockSize);
		expect(file.cachedRead.mock.calls[0][0].offset).toBe(offset);
		expect(file.cachedRead.mock.calls[0][0].size).toBe(blockSize);
		expect(file.cachedRead.mock.calls[0][0].blocking).toBe(true);
		expect((await br.readBlock(1, {blocking: false})).length).toBe(blockSize);
		expect(file.cachedRead.mock.calls[1][0].offset).toBe(offset + blockSize);
		expect(file.cachedRead.mock.calls[1][0].blocking).toBe(false);
	});

	test('make sure block number is given', async () => {
		const file = {size: 4};
		const br = new BlockReader({file, offset: 0, blockSize: 2});
		expect(br.readBlock()).rejects.toThrow('Block number required');
	});
});
describe('BlockReader::bisectSearch', () => {
	test('find first block', async () => {
		const offset = 0;
		const blockSize = 1;
		const data = Buffer.from([0, 3, 7, 8]);
		const read = ({offset, size}) => data.slice(offset, offset + size);
		const file = {size: data.length, read};
		const br = new BlockReader({file, offset, blockSize});
		const needle = Buffer.from([0]);
		const fn = (b) => {
			expect(b.length).toBe(blockSize);
			return Buffer.compare(needle, b);
		};
		expect(await br.bisectSearch(fn)).toBe(0);
	});

	test('find second block', async () => {
		const offset = 0;
		const blockSize = 1;
		const data = Buffer.from([0, 3, 7, 8]);
		const read = ({offset, size}) => data.slice(offset, offset + size);
		const file = {size: data.length, read};
		const br = new BlockReader({file, offset, blockSize});
		const needle = Buffer.from([2]);
		const fn = (b) => {
			expect(b.length).toBe(blockSize);
			return Buffer.compare(needle, b);
		};
		expect(await br.bisectSearch(fn)).toBe(1);
	});

	test('find third block', async () => {
		const offset = 0;
		const blockSize = 1;
		const data = Buffer.from([0, 3, 5, 8]);
		const read = ({offset, size}) => data.slice(offset, offset + size);
		const file = {size: data.length, read};
		const br = new BlockReader({file, offset, blockSize});
		const needle = Buffer.from([4]);
		const fn = (b) => {
			expect(b.length).toBe(blockSize);
			return Buffer.compare(needle, b);
		};
		expect(await br.bisectSearch(fn)).toBe(2);
	});

	test('find last block', async () => {
		const offset = 0;
		const blockSize = 1;
		const data = Buffer.from([0, 3, 5, 8]);
		const read = ({offset, size}) => data.slice(offset, offset + size);
		const file = {size: data.length, read};
		const br = new BlockReader({file, offset, blockSize});
		const needle = Buffer.from([7]);
		const fn = (b) => {
			expect(b.length).toBe(blockSize);
			return Buffer.compare(needle, b);
		};
		expect(await br.bisectSearch(fn)).toBe(3);
	});

	test('find future block', async () => {
		const offset = 0;
		const blockSize = 1;
		const data = Buffer.from([0, 3, 5, 8]);
		const read = ({offset, size}) => data.slice(offset, offset + size);
		const file = {size: data.length, read};
		const br = new BlockReader({file, offset, blockSize});
		const needle = Buffer.from([9]);
		const fn = (b) => {
			expect(b.length).toBe(blockSize);
			return Buffer.compare(needle, b);
		};
		expect(await br.bisectSearch(fn)).toBe(4);
	});
});
