jest.mock('fs-ext');
const mockFs = require('fs-ext');

jest.mock('../lib/writable.js');
const mockWritable = require('../lib/writable.js');

jest.mock('../lib/readable.js');
const mockReadable = require('../lib/readable.js');

const db = require('../db.js');

describe('db.open', () => {
	const dbOpen = db.open;

	test('return instance of DB', async () => {
		const d = await dbOpen('test');
		expect(d).toBeInstanceOf(db.Database);
	});

	test('create db dir if it does not exist', async () => {
		const file = 'test';
		mockFs.stat.mockImplementationOnce((path, cb) => {
			const e = new Error();
			e.code = 'ENOENT';
			cb(e);
		});
		await dbOpen(file);
		expect(mockFs.stat.mock.calls[0][0]).toEqual(file);
		expect(mockFs.mkdir.mock.calls[0][0]).toEqual(file);
	});

	test('fail if path is not a dir', async () => {
		const file = 'test';
		mockFs.stat.mockImplementationOnce((path, cb) => cb(null, {
			isDirectory: () => false
		}));
		try {
			await dbOpen(file);
			throw new Error('Failed!');
		} catch (e) {
			expect(e.message).toEqual('Given path is not a directory');
		}
	});
});

describe('db.Database', () => {
	const Database = db.Database;

	test('createWriteStream', async () => {
		const path = 'a/b';
		const series = 'c';
		const opts = {};
		const db = new Database(path);
		await db.createWriteStream(series, opts);
		expect(mockWritable.create.mock.calls[0][0]).toEqual(`${path}/${series}`);
		expect(mockWritable.create.mock.calls[0][1]).toBe(opts);
	});

	test('createReadStream', async () => {
		const path = 'a/b';
		const series = 'c';
		const opts = {};
		const db = new Database(path);
		await db.createReadStream(series, opts);
		expect(mockReadable.create.mock.calls[0][0]).toEqual(`${path}/${series}`);
		expect(mockReadable.create.mock.calls[0][1]).toBe(opts);
	});
});
