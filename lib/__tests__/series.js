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
			expect(e.message).toEqual('meta must be a string');
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
		const meta = 'module.exports = {itemLen: 0, pack: () => Buffer.alloc(0), unpack: () => true}';
		const fd = 42;
		const data = Buffer.alloc(28, 'a');
		const metaStart = data.length;
		const metaEnd = metaStart + meta.length;
		const dataStart = metaEnd;
		const tsLen = 8;
		const itemLen = 43;

		mockMeta.read.mockImplementationOnce(() => ({itemLen, pack: () => {}, unpack: () => {}}));
		mockHeader.gen.mockImplementationOnce(() => ({metaStart, metaEnd, dataStart, tsLen, itemLen, data}));
		fs.open.mockImplementationOnce((path, flags, cb) => cb(null, fd));
		fs.write.mockImplementationOnce((fd, data, cb) => cb(null));

		await seriesCreate(path, meta);

		expect(mockHeader.gen.mock.calls[0][0]).toMatchObject({meta, itemLen});
		expect(fs.open.mock.calls[0][0]).toEqual(path);
		expect(fs.open.mock.calls[0][1]).toEqual('w');
		expect(fs.write.mock.calls[0][0]).toBe(fd);
		expect(fs.write.mock.calls[0][1].slice(0, metaStart).toString()).toEqual(data.toString());
		expect(fs.write.mock.calls[0][1].slice(metaStart, metaEnd).toString()).toEqual(meta);
		expect(fs.write.mock.calls[0][1].length).toBe(dataStart);
		expect(fs.close.mock.calls[0][0]).toBe(fd);
	});
	// test('open given patch for writing', async () => {});
});
