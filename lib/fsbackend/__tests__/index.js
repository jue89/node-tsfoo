jest.mock('../file.js');
const mockFile = require('../file.js').File;
const mockFileFilesystem = require('../file.js').filesystem;

jest.mock('../blockReader.js');
const mockBlockReader = require('../blockReader.js').BlockReader;

jest.mock('../blockAppender.js');
const mockBlockAppender = require('../blockAppender.js').BlockAppender;

jest.mock('borc');
const mockBorc = require('borc');

const {open, MAGIC, BLOCKSIZE} = require('../index.js');

describe('open()', () => {
	test('write magic to empty files (writer)', async () => {
		const dir = 'def';
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`${dir}/idx-${name}`, null]);
		mockFileFilesystem.mockReturnValueOnce([`${dir}/dat-${name}`, null]);
		await open({dir, name, access: 'rw'});
		expect(mockFile.mock.instances[0].openReadWrite.mock.calls[0][0]).toMatchObject({
			blocking: true,
			create: true
		});
		expect(mockFile.mock.instances[1].openReadWrite.mock.calls[0][0]).toMatchObject({
			blocking: true,
			create: true
		});
		expect(mockFile.mock.instances[0].content).toMatchObject(MAGIC);
		expect(mockFile.mock.instances[1].access).toEqual('rw');
		expect(mockFile.mock.instances[1].access).toEqual('rw');
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

	test('write magic to empty files (reader)', async () => {
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`idx-${name}`, null]);
		mockFileFilesystem.mockReturnValueOnce([`dat-${name}`, null]);
		await open({name, access: 'ro'});
		// idx file
		expect(mockFile.mock.instances[0].openReadWrite.mock.calls[0][0]).toMatchObject({
			blocking: false,
			create: true
		});
		expect(mockFile.mock.instances[0].content).toMatchObject(MAGIC);
		// access === 'ro' implies that the file has been closed and reopened with openRead
		expect(mockFile.mock.instances[0].access).toEqual('ro');

		expect(mockFile.mock.instances[1].openReadWrite.mock.calls[0][0]).toMatchObject({
			blocking: false,
			create: true
		});
		// access === 'ro' implies that the file has been closed and reopened with openRead
		expect(mockFile.mock.instances[1].access).toEqual('ro');
	});

	test('fail if magic is not present', async () => {
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`idx-${name}`, Buffer.alloc(1)]);
		mockFileFilesystem.mockReturnValueOnce([`dat-${name}`, Buffer.alloc(1)]);
		await expect(open({name, access: 'rw'})).rejects.toThrow('File magic is not matching!');
		expect(mockFile.mock.instances[0].close.mock.calls.length).toBe(1);
		expect(mockFile.mock.instances[1].close.mock.calls.length).toBe(1);
	});
});

describe('read()', () => {
	test('read nth block', async () => {
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`idx-${name}`, MAGIC]);
		const dat = Buffer.from('abcdef');
		mockFileFilesystem.mockReturnValueOnce([`dat-${name}`, dat]);
		const db = await open({name});

		// Prepare the block reader
		const timestamp = 123456789;
		const offset = 3;
		const size = 3;
		const idxBuf = Buffer.alloc(BLOCKSIZE);
		idxBuf.writeUIntBE(timestamp, 0, 6);
		idxBuf.writeUIntBE(offset, 6, 6);
		idxBuf.writeUIntBE(size, 12, 4);
		mockBlockReader.mock.instances[0].readBlock.mockReturnValueOnce(idxBuf);
		// Prepare the decoder
		const value = {};
		mockBorc.decodeFirst.mockReturnValueOnce(value);
		// Read nth block
		const n = 678;
		expect(await db.read(n)).toMatchObject({timestamp, value});

		expect(mockBlockReader.mock.instances[0].readBlock.mock.calls[0][0]).toBe(n);
		expect(mockFile.mock.instances[1].cachedRead.mock.calls[0][0]).toMatchObject({offset, size, blocking: true});
		expect(mockBorc.decodeFirst.mock.calls[0][0]).toEqual(dat.slice(offset, offset + size));
	});
});

describe('search()', () => {
	test('call bisect search', async () => {
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`idx-${name}`, MAGIC]);
		mockFileFilesystem.mockReturnValueOnce([`dat-${name}`, Buffer.alloc(0)]);
		const timestamp = 123456789;
		const ts2buf = (ts) => {
			const buf = Buffer.allocUnsafe(6);
			buf.writeUIntBE(ts, 0, 6);
			return buf;
		};
		const db = await open({name});
		const n = await db.search(timestamp);
		const fn = mockBlockReader.mock.instances[0].bisectSearch.mock.calls[0][0];
		expect(fn(ts2buf(timestamp))).toBe(0);
		expect(fn(ts2buf(timestamp + 1))).toBeLessThan(0);
		expect(fn(ts2buf(timestamp - 1))).toBeGreaterThan(0);
		expect(n).toBe(mockBlockReader.mock.instances[0].bisectSearch.mock.results[0].value);
	});
});

describe('write()', () => {
	test('write data', async () => {
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`idx-${name}`, MAGIC]);
		mockFileFilesystem.mockReturnValueOnce([`dat-${name}`, Buffer.alloc(0)]);
		const db = await open({name, access: 'rw'});
		const value = 123;
		const timestamp = 234567890;
		await db.write({value, timestamp});
		expect(mockFile.mock.instances[1].content).toEqual(mockBorc.encode.mock.results[0].value);
		const idx = Buffer.alloc(BLOCKSIZE);
		idx.writeUIntBE(timestamp, 0, 6);
		idx.writeUIntBE(mockFile.mock.instances[1].write.mock.results[0].value.offset, 6, 6);
		idx.writeUIntBE(mockFile.mock.instances[1].write.mock.results[0].value.size, 12, 4);
		expect(mockBlockAppender.mock.instances[0].write.mock.calls[0][0]).toEqual(idx);
	});
});

describe('getSize()', () => {
	test('forward block reader size', async () => {
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`idx-${name}`, MAGIC]);
		mockFileFilesystem.mockReturnValueOnce([`dat-${name}`, Buffer.alloc(123)]);
		const db = await open({name});
		const size = 123;
		mockBlockReader.mock.instances[0].size = size;
		expect(db.getSize()).toBe(size);
	});
});

describe('close()', () => {
	test('close all files', async () => {
		const name = 'abc';
		mockFileFilesystem.mockReturnValueOnce([`idx-${name}`, MAGIC]);
		mockFileFilesystem.mockReturnValueOnce([`dat-${name}`, Buffer.alloc(0)]);
		const db = await open({name, access: 'ro'});
		await db.close();
		expect(mockFile.mock.instances[0].access).toBeUndefined();
		expect(mockFile.mock.instances[1].access).toBeUndefined();
	});
});
