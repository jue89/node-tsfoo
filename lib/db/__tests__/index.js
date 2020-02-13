jest.mock('../file.js');
const mockFile = require('../file.js').File;

jest.mock('../blockReader.js');
const mockBlockReader = require('../blockReader.js').BlockReader;

jest.mock('../blockAppender.js');
const mockBlockAppender = require('../blockAppender.js').BlockAppender;

jest.mock('borc');
const mockBorc = require('borc');

const {open, MAGIC, BLOCKSIZE} = require('../index.js');

// Default used for MAGIC checking procedure
mockFile.prototype.read.mockReturnValue(MAGIC);

describe('open()', () => {
	test('create file handles', async () => {
		const dir = 'abc';
		const name = 'xyz';
		await open({dir, name});
		expect(mockFile.mock.calls[0][0]).toEqual(`${dir}/idx-${name}`);
		expect(mockFile.mock.calls[1][0]).toEqual(`${dir}/dat-${name}`);
		expect(mockFile.mock.instances[0].access).toEqual('ro');
		expect(mockFile.mock.instances[1].access).toEqual('ro');
		expect(mockBlockReader.mock.calls[0][0]).toMatchObject({
			file: mockFile.mock.instances[0],
			offset: MAGIC.length,
			blockSize: BLOCKSIZE
		});
		expect(mockBlockAppender.mock.calls[0][0]).toMatchObject({
			file: mockFile.mock.instances[0],
			offset: MAGIC.length,
			blockSize: BLOCKSIZE
		});
	});

	test('write magic to empty files', async () => {
		mockFile.prototype.size = 0;
		await open({access: 'rw'});
		expect(mockFile.prototype.openReadWrite.mock.calls[0][0]).toMatchObject({
			blocking: true,
			create: true
		});
		expect(mockFile.prototype.openReadWrite.mock.calls[1][0]).toMatchObject({
			blocking: true,
			create: true
		});
		expect(mockFile.prototype.write.mock.calls[0][0]).toMatchObject({
			offset: 0,
			data: MAGIC
		});
	});

	test('fail if magic is not present', async () => {
		mockFile.prototype.read.mockReturnValueOnce(Buffer.alloc(MAGIC.length));
		await expect(open({access: 'ro'})).rejects.toThrow('File magic is not matching!');
		expect(mockFile.prototype.openRead.mock.calls.length).toBe(1);
		expect(mockFile.prototype.read.mock.calls[0][0]).toMatchObject({
			offset: 0,
			size: MAGIC.length,
			blocking: false
		});
		expect(mockFile.prototype.close.mock.calls.length).toBe(2);
	});
});

describe('read()', () => {
	test('read nth block', async () => {
		const timestamp = 123456789;
		const offset = 54321;
		const size = 1234;
		const idxBuf = Buffer.alloc(BLOCKSIZE);
		idxBuf.writeUIntBE(timestamp, 0, 6);
		idxBuf.writeUIntBE(offset, 6, 6);
		idxBuf.writeUIntBE(size, 12, 4);
		mockBlockReader.prototype.readBlock.mockReturnValueOnce(idxBuf);
		const value = {};
		mockBorc.decodeFirst.mockReturnValueOnce(value);
		const db = await open({});
		const datBuf = Buffer.alloc(1);
		mockFile.prototype.cachedRead.mockReturnValueOnce(datBuf);
		const n = 678;
		expect(await db.read(n)).toMatchObject({timestamp, value});
		expect(mockBlockReader.prototype.readBlock.mock.calls[0][0]).toBe(n);
		expect(mockFile.prototype.cachedRead.mock.calls[0][0]).toMatchObject({offset, size, blocking: true});
		expect(mockBorc.decodeFirst.mock.calls[0][0]).toBe(datBuf);
	});
});

describe('search()', () => {
	test('call bisect search', async () => {
		const timestamp = 123456789;
		const ts2buf = (ts) => {
			const buf = Buffer.allocUnsafe(6);
			buf.writeUIntBE(ts, 0, 6);
			return buf;
		};
		const db = await open({});
		const n = await db.search(timestamp);
		const fn = mockBlockReader.prototype.bisectSearch.mock.calls[0][0];
		expect(fn(ts2buf(timestamp))).toBe(0);
		expect(fn(ts2buf(timestamp + 1))).toBeLessThan(0);
		expect(fn(ts2buf(timestamp - 1))).toBeGreaterThan(0);
		expect(n).toBe(mockBlockReader.prototype.bisectSearch.mock.results[0].value);
	});
});

describe('write()', () => {
	test('write data', async () => {
		const db = await open({});
		const value = 123;
		const timestamp = 234567890;
		await db.write({value, timestamp});
		expect(mockFile.mock.instances[1].lastWrite).toBe(mockBorc.encode.mock.results[0].value);
		const idx = Buffer.alloc(BLOCKSIZE);
		idx.writeUIntBE(timestamp, 0, 6);
		idx.writeUIntBE(mockFile.prototype.write.mock.results[0].value.offset, 6, 6);
		idx.writeUIntBE(mockFile.prototype.write.mock.results[0].value.size, 12, 4);
		expect(mockBlockAppender.mock.instances[0].write.mock.calls[0][0]).toEqual(idx);
	});
});

describe('getSize()', () => {
	test('forward block reader size', async () => {
		const db = await open({});
		const size = 123;
		mockBlockReader.mock.instances[0].size = size;
		expect(db.getSize()).toBe(size);
	});
});
