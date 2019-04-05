jest.mock('../series.js');
const mockSeries = require('../series.js');

jest.mock('fs-ext');
const mockFs = require('fs-ext');

const writable = require('../writable.js');

describe('writable.create', () => {
	const writableCreate = writable.create;

	test('open series non-blocking', async () => {
		const name = 'test';
		await writableCreate(name);
		expect(mockSeries.open.mock.calls[0][0]).toEqual(name);
		expect(mockSeries.open.mock.calls[0][1]).toEqual('w');
	});

	test('open series blocking', async () => {
		const name = 'test';
		const opts = {waitForLock: true};
		await writableCreate(name, opts);
		expect(mockSeries.open.mock.calls[0][0]).toEqual(name);
		expect(mockSeries.open.mock.calls[0][1]).toEqual('w+');
	});

	test('fail if series cannot be opened', async () => {
		mockSeries.open.mockImplementationOnce(() => {
			const e = new Error();
			e.code = 'ENOENT';
			return Promise.reject(e);
		});
		try {
			await writableCreate('');
			throw new Error('Failed!');
		} catch (e) {
			expect(e.code).toEqual('ENOENT');
		}
	});

	test('create series seamlessly if defaultMetaCode is defined', async () => {
		const file = 'abc';
		const opts = {defaultMetaCode: 'test'};
		mockSeries.open.mockImplementationOnce(() => {
			const e = new Error();
			e.code = 'ENOENT';
			return Promise.reject(e);
		});
		await writableCreate(file, opts);
		expect(mockSeries.open.mock.calls[0][0]).toEqual(file);
		expect(mockSeries.create.mock.calls[0][0]).toEqual(file);
		expect(mockSeries.create.mock.calls[0][1]).toEqual(opts.defaultMetaCode);
		expect(mockSeries.open.mock.calls[1][0]).toEqual(file);
	});

	test('read last timestamp if records are available', async () => {
		const ts = 123456789;
		const seriesFile = {
			fd: 123,
			header: {dataStart: 42, tsLen: 6, itemLen: 14},
			stat: {size: 42 + 2 * (6 + 14)}
		};
		mockFs.read.mockImplementationOnce((f, b, o, l, p, cb) => {
			b.writeIntBE(ts, 0, 6);
			cb(null);
		});
		mockSeries.open.mockImplementationOnce(() => seriesFile);
		await writableCreate('a');
		expect(mockFs.read.mock.calls[0][0]).toBe(seriesFile.fd);
		expect(mockFs.read.mock.calls[0][3]).toBe(seriesFile.header.tsLen);
		expect(mockFs.read.mock.calls[0][4]).toBe(seriesFile.header.dataStart + seriesFile.header.tsLen + seriesFile.header.itemLen);
		expect(seriesFile.lastTs).toBe(ts);
		expect(seriesFile.ptr).toBe(seriesFile.stat.size);
		expect(seriesFile.recordLen).toBe(seriesFile.header.tsLen + seriesFile.header.itemLen);
	});

	test('ignore half-written records', async () => {
		const seriesFile = {
			fd: 123,
			header: {dataStart: 42, tsLen: 6, itemLen: 14},
			stat: {size: 42 + 2 * (6 + 14) + 1}
		};
		mockSeries.open.mockImplementationOnce(() => seriesFile);
		await writableCreate('a');
		expect(mockFs.read.mock.calls[0][4]).toBe(seriesFile.header.dataStart + seriesFile.header.tsLen + seriesFile.header.itemLen);
		expect(seriesFile.ptr).toBe(seriesFile.stat.size - 1);
	});

	test('set lastTs to minimal TS', async () => {
		const lowerBound = Buffer.from([128, 0, 0, 0, 0, 0]).readIntBE(0, 6);
		const seriesFile = {
			fd: 123,
			header: {dataStart: 42, tsLen: 6, itemLen: 14},
			stat: {size: 42}
		};
		mockSeries.open.mockImplementationOnce(() => seriesFile);
		await writableCreate('a');
		expect(seriesFile.lastTs).toBe(lowerBound);
	});

	test('return instance of WriteStream', async () => {
		const stream = await writableCreate('a');
		expect(stream).toBeInstanceOf(writable.WriteStream);
	});
});

describe('writable.WriteStream', () => {
	const WriteStream = writable.WriteStream;

	test('write item to file', async () => {
		const itemLen = 8;
		const item = Buffer.alloc(itemLen, 'a');
		const ptr = 44;
		const seriesFile = {
			fd: 123,
			meta: {pack: jest.fn(() => item)},
			header: {tsLen: 6, itemLen},
			recordLen: itemLen + 6,
			ptr
		};
		const timestamp = 1234567;
		const timestampBuf = Buffer.alloc(seriesFile.header.tsLen);
		timestampBuf.writeIntBE(timestamp, 0, seriesFile.header.tsLen);
		const value = 42;
		const w = new WriteStream(seriesFile);
		await new Promise((resolve) => w.write({timestamp, value}, resolve));
		expect(seriesFile.meta.pack.mock.calls[0][0]).toBe(value);
		expect(mockFs.write.mock.calls[0][0]).toBe(seriesFile.fd);
		expect(Buffer.compare(
			mockFs.write.mock.calls[0][1].slice(0, seriesFile.header.tsLen),
			timestampBuf
		)).toBe(0);
		expect(Buffer.compare(
			mockFs.write.mock.calls[0][1].slice(seriesFile.header.tsLen),
			item
		)).toBe(0);
		expect(mockFs.write.mock.calls[0][4]).toBe(ptr);
		expect(w.ptr).toBe(ptr + seriesFile.recordLen);
		expect(w.lastTs).toBe(timestamp);
	});

	test('throw error if pack function did not return the right buffer', async () => {
		const itemLen = 8;
		const item = Buffer.alloc(itemLen - 1, 'a');
		const seriesFile = {
			fd: 123,
			meta: {pack: jest.fn(() => item)},
			header: {tsLen: 6, itemLen},
			recordLen: itemLen + 6,
			ptr: 44
		};
		const w = new WriteStream(seriesFile);
		const onError = jest.fn();
		w.on('error', onError);
		await new Promise((resolve) => w.write({timestamp: 1, value: 2}, resolve));
		expect(onError.mock.calls[0][0].message).toEqual('Pack function returned an invalid buffer');
	});

	test('set timestamp to Date.now() if it is omitted', async () => {
		const timestamp = 99999;
		Date.now = jest.fn(() => timestamp);
		const seriesFile = {
			fd: 123,
			meta: {pack: jest.fn(() => Buffer.alloc(0))},
			header: {tsLen: 6, itemLen: 0},
			recordLen: 6,
			ptr: 44
		};
		const w = new WriteStream(seriesFile);
		await new Promise((resolve) => w.write({value: 2}, resolve));
		expect(mockFs.write.mock.calls[0][1].readIntBE(0, seriesFile.header.tsLen)).toBe(timestamp);
	});

	test('convert value to object', async () => {
		const seriesFile = {
			fd: 123,
			meta: {pack: jest.fn((value) => Buffer.from([value]))},
			header: {tsLen: 6, itemLen: 1},
			recordLen: 6,
			ptr: 44
		};
		const value = 2;
		const w = new WriteStream(seriesFile);
		await new Promise((resolve) => w.write(value, resolve));
		expect(mockFs.write.mock.calls[0][1][seriesFile.header.tsLen]).toBe(value);
	});

	test('reject timestamps less or equal than the last one', async () => {
		const timestamp = 12345678;
		const seriesFile = {
			fd: 123,
			meta: {pack: jest.fn((value) => Buffer.from([value]))},
			header: {tsLen: 6, itemLen: 1},
			recordLen: 6,
			ptr: 44,
			lastTs: timestamp
		};
		const w = new WriteStream(seriesFile);
		const onError = jest.fn();
		w.on('error', onError);
		await new Promise((resolve) => w.write({timestamp: timestamp - 1, value: 2}, resolve));
		expect(onError.mock.calls[0][0].message).toEqual('timestamps must be monotonically increasing. Last timestamp: ' + timestamp);
	});

	test('close fd on end', async () => {
		const seriesFile = {fd: 123};
		const w = new WriteStream(seriesFile);
		const q = new Promise((resolve) => w.on('finish', resolve));
		w.end();
		await q;
		expect(mockFs.close.mock.calls[0][0]).toBe(seriesFile.fd);
	});

	test('close fd on destroy', async () => {
		const seriesFile = {fd: 123};
		const w = new WriteStream(seriesFile);
		const q = new Promise((resolve) => w.on('close', resolve));
		w.destroy();
		await q;
		expect(mockFs.close.mock.calls[0][0]).toBe(seriesFile.fd);
	});
});
