jest.mock('fs');
const fs = require('fs');

const mockMeta = { read: jest.fn(() => ({itemLen: 0, pack: () => {}, unpack: () => {}})) };
jest.mock('../meta.js', () => mockMeta);

const mockHeader = { gen: jest.fn() };
jest.mock('../header.js', () => mockHeader);

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
		fs.open.mockImplementationOnce((path, flags, cb) => cb(null, fd));
		fs.write.mockImplementationOnce((fd, data, cb) => cb(null));

		const db = await seriesCreate(path, metaCode);

		expect(mockHeader.gen.mock.calls[0][0]).toMatchObject({metaCode, itemLen});
		expect(fs.open.mock.calls[0][0]).toEqual(path);
		expect(fs.open.mock.calls[0][1]).toEqual('w');
		expect(fs.write.mock.calls[0][0]).toBe(fd);
		expect(fs.write.mock.calls[0][1].slice(0, metaStart).toString()).toEqual(data.toString());
		expect(fs.write.mock.calls[0][1].slice(metaStart, metaEnd).toString()).toEqual(metaCode);
		expect(fs.write.mock.calls[0][1].length).toBe(dataStart);
		expect(db).toMatchObject({fd, header, meta});
	});
});
