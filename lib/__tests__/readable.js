jest.mock('fs-ext');
const mockFs = require('fs-ext');

jest.mock('../series.js');
const mockSeries = require('../series.js');

const readable = require('../readable.js');

const immediate = () => new Promise((resolve) => setImmediate(resolve));

describe('readable.create', () => {
	const readableCreate = readable.create;

	test('open series file', async () => {
		const file = 'abc';
		const from = 22132;
		const seriesFile = {
			fd: 123,
			header: {dataStart: 123, tsLen: 6, itemLen: 4},
			stat: {size: 123 + 11}
		};
		mockSeries.open.mockImplementationOnce(() => seriesFile);
		const r = await readableCreate(file, {from});
		expect(mockSeries.open.mock.calls[0][0]).toEqual(file);
		expect(mockSeries.open.mock.calls[0][1]).toEqual('r');
		expect(seriesFile.from).toBe(from);
		expect(seriesFile.ptr).toBe(seriesFile.header.dataStart);
		expect(seriesFile.recordLen).toBe(seriesFile.header.tsLen + seriesFile.header.itemLen);
		expect(seriesFile.stopAt).toBe(seriesFile.header.dataStart + 10);
		expect(r).toBeInstanceOf(readable.ReadStream);
	});

	test('fail if series cannot be opened', async () => {
		mockSeries.open.mockImplementationOnce(() => {
			const e = new Error();
			e.code = 'ENOENT';
			return Promise.reject(e);
		});
		try {
			await readableCreate('');
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
		await readableCreate(file, opts);
		expect(mockSeries.open.mock.calls[0][0]).toEqual(file);
		expect(mockSeries.create.mock.calls[0][0]).toEqual(file);
		expect(mockSeries.create.mock.calls[0][1]).toEqual(opts.defaultMetaCode);
		expect(mockSeries.open.mock.calls[1][0]).toEqual(file);
	});

	test('open series file in follow mode', async () => {
		const opts = {follow: true};
		const seriesFile = {
			fd: 123,
			header: {dataStart: 123, tsLen: 6, itemLen: 4},
			stat: {size: 123}
		};
		mockSeries.open.mockImplementationOnce(() => seriesFile);
		await readableCreate('file', opts);
		expect(seriesFile.stopAt).toBeUndefined();
	});
});

describe('readable.ReadStream', () => {
	const ReadStream = readable.ReadStream;

	test('read one item', async () => {
		const timestamp = 1;
		const value = 42;
		mockFs.read.mockImplementationOnce((f, b, o, l, p, cb) => {
			b.writeIntBE(timestamp, 0, 6);
			b.writeUInt8(value, 6);
			cb(null);
		});
		const seriesFile = {
			fd: 123,
			path: 'abc',
			follow: false,
			ptr: 42,
			recordLen: 7,
			stopAt: 49,
			header: {tsLen: 6, itemLen: 1},
			meta: {unpack: (buf) => buf[0]}
		};
		const r = new ReadStream(seriesFile);
		const onData = jest.fn();
		r.on('data', onData);
		await immediate();
		expect(mockFs.read.mock.calls[0][0]).toBe(seriesFile.fd);
		expect(mockFs.read.mock.calls[0][4]).toBe(seriesFile.ptr);
		expect(r.ptr).toBe(seriesFile.ptr + seriesFile.recordLen);
		expect(onData.mock.calls[0][0]).toMatchObject({timestamp, value});
		expect(mockFs.close.mock.calls[0][0]).toBe(seriesFile.fd);
		expect(mockFs.unwatchFile.mock.calls[0][0]).toEqual(seriesFile.path);
	});

	test('install watchFile listener if in follow mode', async () => {
		const seriesFile = {
			path: 'abc',
			follow: true,
			ptr: 42,
			recordLen: 7,
			header: {tsLen: 6, itemLen: 1},
			meta: {unpack: (buf) => buf[0]},
			stat: {size: 48}
		};
		const r = new ReadStream(seriesFile);
		const onData = jest.fn();
		r.on('data', onData);
		await immediate();
		expect(onData.mock.calls.length).toBe(0);
		mockFs.watchFile.mock.calls[0][1]({size: 49});
		await immediate();
		expect(onData.mock.calls.length).toBe(1);
	});

	test('ignore items with timestamp <= from', async () => {
		let timestamp = 1;
		const value = 42;
		mockFs.read.mockImplementation((f, b, o, l, p, cb) => {
			b.writeIntBE(timestamp++, 0, 6);
			b.writeUInt8(value, 6);
			cb(null);
		});
		const seriesFile = {
			fd: 123,
			path: 'abc',
			follow: false,
			ptr: 42,
			recordLen: 7,
			stopAt: 56,
			header: {tsLen: 6, itemLen: 1},
			meta: {unpack: (buf) => buf[0]},
			from: 1
		};
		const r = new ReadStream(seriesFile);
		const onData = jest.fn();
		r.on('data', onData);
		await immediate();
		expect(onData.mock.calls.length).toBe(1);
		expect(onData.mock.calls[0][0]).toMatchObject({
			timestamp: 2,
			value
		});
	});

	test('ignore items with timestamp > to', async () => {
		let timestamp = 1;
		const value = 42;
		mockFs.read.mockImplementation((f, b, o, l, p, cb) => {
			b.writeIntBE(timestamp++, 0, 6);
			b.writeUInt8(value, 6);
			cb(null);
		});
		const seriesFile = {
			fd: 123,
			path: 'abc',
			follow: false,
			ptr: 42,
			recordLen: 7,
			stopAt: 56,
			header: {tsLen: 6, itemLen: 1},
			meta: {unpack: (buf) => buf[0]},
			to: 1
		};
		const r = new ReadStream(seriesFile);
		const onData = jest.fn();
		r.on('data', onData);
		await immediate();
		expect(onData.mock.calls.length).toBe(1);
		expect(onData.mock.calls[0][0]).toMatchObject({
			timestamp: 1,
			value
		});
	});
});
