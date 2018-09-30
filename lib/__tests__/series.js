jest.mock('fs');
const mockFs = require('fs');

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

		const db = await seriesCreate(path, metaCode);

		expect(mockHeader.gen.mock.calls[0][0]).toMatchObject({metaCode, itemLen});
		expect(mockFs.open.mock.calls[0][0]).toEqual(path);
		expect(mockFs.open.mock.calls[0][1]).toEqual('w');
		expect(mockFs.write.mock.calls[0][0]).toBe(fd);
		expect(mockFs.write.mock.calls[0][1].slice(0, metaStart).toString()).toEqual(data.toString());
		expect(mockFs.write.mock.calls[0][1].slice(metaStart, metaEnd).toString()).toEqual(metaCode);
		expect(mockFs.write.mock.calls[0][1].length).toBe(dataStart);
		expect(mockFs.write.mock.calls[0][2]).toBe(0);
		expect(mockFs.write.mock.calls[0][3]).toBe(dataStart);
		expect(mockFs.write.mock.calls[0][4]).toBe(0);
		expect(db).toMatchObject({fd, pos: dataStart, header, meta});
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

		mockFs.open.mockImplementationOnce((f, m, cb) => cb(null, fd));
		mockHeader.read.mockImplementationOnce(() => header);
		mockMeta.read.mockImplementationOnce(() => meta);

		const db = await seriesOpen('test', 'r');

		expect(db).toMatchObject({fd, header, meta});
	});

	test('set pos to dataStart for mode \'r\'', async () => {
		const dataStart = 3;
		const header = {metaStart: 1, metaStop: 2, dataStart};

		mockHeader.read.mockImplementationOnce(() => header);

		const db = await seriesOpen('test', 'r');

		expect(db.pos).toBe(dataStart);
	});

	test('set pos to end of file for mode \'r+\'', async () => {
		const fd = 123;
		const size = 43;

		mockFs.open.mockImplementationOnce((f, m, cb) => cb(null, fd));
		mockFs.fstat.mockImplementationOnce((fd, cb) => cb(null, {size}));

		const db = await seriesOpen('test', 'r+');

		expect(mockFs.fstat.mock.calls[0][0]).toBe(fd);
		expect(db.pos).toBe(size);
	});
});
