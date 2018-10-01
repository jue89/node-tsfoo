jest.mock('fs-ext');
const mockFs = require('fs-ext');

jest.mock('../meta.js');
const mockMeta = require('../meta.js');

jest.mock('../header.js');
const mockHeader = require('../header.js');

const series = require('../series.js');

describe('series.create', () => {
	const seriesCreate = series.create;

	test('enforce path to be set', async () => {
		try {
			await seriesCreate();
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('path must be a string');
		}
	});

	test('enforce meta to be set', async () => {
		try {
			await seriesCreate('test');
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('metaCode must be a string');
		}
	});

	test('enforce meta has defined itemLen', async () => {
		const meta = 'abc';
		mockMeta.read.mockImplementationOnce(() => ({pack: () => {}, unpack: () => {}}));
		try {
			await seriesCreate('test', meta);
			expect(mockMeta.read.mock.calls[0][0]).toBe(meta);
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('meta must export itemLen');
		}
	});

	test('enforce meta has defined pack function', async () => {
		mockMeta.read.mockImplementationOnce(() => ({itemLen: 0, unpack: () => {}}));
		try {
			await seriesCreate('test', 'test');
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('meta must export function pack');
		}
	});

	test('enforce meta has defined unpack function', async () => {
		mockMeta.read.mockImplementationOnce(() => ({itemLen: 0, pack: () => {}}));
		try {
			await seriesCreate('test', 'test');
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('meta must export function unpack');
		}
	});

	test('create empty series files', async () => {
		const path = 'a';
		const metaCode = 'Blub';
		const meta = {itemLen: 8, pack: () => {}, unpack: () => {}};
		const fd = 42;
		const data = Buffer.alloc(28, 'a');
		const metaStart = data.length;
		const metaEnd = metaStart + metaCode.length;
		const dataStart = metaEnd;
		const tsLen = 8;
		const itemLen = meta.itemLen;
		const header = {metaStart, metaEnd, dataStart, tsLen, itemLen, data};

		mockMeta.read.mockImplementationOnce(() => meta);
		mockHeader.gen.mockImplementationOnce(() => header);
		mockFs.open.mockImplementationOnce((path, flags, cb) => cb(null, fd));
		mockFs.fstat.mockImplementationOnce((fd, cb) => cb(null, {size: 0}));

		const created = await seriesCreate(path, metaCode);

		expect(mockHeader.gen.mock.calls[0][0]).toMatchObject({metaCode, itemLen});
		expect(mockFs.open.mock.calls[0][0]).toEqual(path);
		expect(mockFs.open.mock.calls[0][1]).toEqual('a');
		expect(mockFs.flock.mock.calls[0][0]).toBe(fd);
		expect(mockFs.flock.mock.calls[0][1]).toBe('ex');
		expect(mockFs.fstat.mock.calls[0][0]).toBe(fd);
		expect(mockFs.write.mock.calls[0][0]).toBe(fd);
		expect(mockFs.write.mock.calls[0][1].slice(0, metaStart).toString()).toEqual(data.toString());
		expect(mockFs.write.mock.calls[0][1].slice(metaStart, metaEnd).toString()).toEqual(metaCode);
		expect(mockFs.write.mock.calls[0][1].length).toBe(dataStart);
		expect(mockFs.write.mock.calls[0][2]).toBe(0);
		expect(mockFs.write.mock.calls[0][3]).toBe(dataStart);
		expect(mockFs.write.mock.calls[0][4]).toBe(0);
		expect(mockFs.close.mock.calls[0][0]).toBe(fd);
		expect(created).toBeTruthy();
	});

	test('fail if file is not empty', async () => {
		mockFs.fstat.mockImplementationOnce((fd, cb) => cb(null, {size: 1}));
		try {
			await seriesCreate('path', 'metaCode');
			throw new Error('Failed!');
		} catch (e) {
			expect(mockFs.close.mock.calls.length).toBe(1);
			expect(e.message).toEqual('Series file is not empty');
		}
	});

	test('make sure failing things close the file', async () => {
		mockFs.fstat.mockImplementationOnce((fd, cb) => cb(new Error()));
		try {
			await seriesCreate('path', 'metaCode');
			throw new Error('Failed!');
		} catch (e) {
			expect(mockFs.close.mock.calls.length).toBe(1);
		}
	});
});

describe('series.open', () => {
	const seriesOpen = series.open;

	test('enforce path to be set', async () => {
		try {
			await seriesOpen();
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('path must be a string');
		}
	});

	test('enforce mode to be set', async () => {
		try {
			await seriesOpen('test');
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('mode must be a string');
		}
	});

	test('enforce mode to be \'r\' or \'r+\'', async () => {
		try {
			await seriesOpen('test', 'w');
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('mode must be \'r\' or \'r+\'');
		}
	});

	test('open given path', async () => {
		const path = 'abc';
		const mode = 'r';
		await seriesOpen(path, mode);
		expect(mockFs.open.mock.calls[0][0]).toEqual(path);
		expect(mockFs.open.mock.calls[0][1]).toEqual(mode);
	});

	test('get lock for \'r+\'', async () => {
		const fd = 123;
		const mode = 'r+';
		mockFs.open.mockImplementationOnce((f, m, cb) => cb(null, fd));
		await seriesOpen('test', mode);
		expect(mockFs.flock.mock.calls[0][0]).toBe(fd);
		expect(mockFs.flock.mock.calls[0][1]).toEqual('ex');
	});

	test('close file if some error is thrown', async () => {
		const fd = 123;
		mockFs.open.mockImplementationOnce((f, m, cb) => cb(null, fd));
		mockMeta.read.mockImplementationOnce(() => { throw new Error(); });
		try {
			await seriesOpen('test', 'r');
			throw new Error('Failed!');
		} catch (e) {
			expect(mockFs.close.mock.calls[0][0]).toBe(fd);
		}
	});

	test('read header and from file', async () => {
		const fd = 123;
		mockFs.open.mockImplementationOnce((f, m, cb) => cb(null, fd));
		await seriesOpen('test', 'r');
		expect(mockFs.read.mock.calls[0][0]).toBe(fd);
		expect(mockHeader.read.mock.calls[0][0]).toBe(mockFs.read.mock.calls[0][1]);
		expect(mockFs.read.mock.calls[1][0]).toBe(fd);
		expect(mockMeta.read.mock.calls[0][0]).toMatch(mockFs.read.mock.calls[1][1].toString());
	});

	test('return header and meta', async () => {
		const fd = 123;
		const header = {metaStart: 1, metaStop: 2, dataStart: 3};
		const meta = {itemLen: 123};
		const stat = {size: 123};

		mockFs.open.mockImplementationOnce((f, m, cb) => cb(null, fd));
		mockFs.fstat.mockImplementationOnce((fd, cb) => cb(null, stat));
		mockHeader.read.mockImplementationOnce(() => header);
		mockMeta.read.mockImplementationOnce(() => meta);

		const db = await seriesOpen('test', 'r');

		expect(db).toMatchObject({fd, header, meta, stat});
	});
});
