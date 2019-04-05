jest.mock('fs-ext');
const mockFs = require('fs-ext');

const CachedRead = require('../cachedRead.js');

test('Set default size to 40960 bytes', () => {
	const c = new CachedRead();
	expect(c.size).toBe(40960);
});

test('Read ahead', async () => {
	const fd = 123;
	const size = 4;
	const c = new CachedRead(fd, size);
	mockFs.read.mockImplementationOnce((fd, buffer, offset, length, position, cb) => {
		for (let i = 0; i < length; i++) buffer[i] = i % 256;
		cb(null, length, buffer);
	});
	const d = await c.read(0, 2);
	expect(d.toString('hex')).toEqual('0001');
	expect(mockFs.read.mock.calls[0][0]).toBe(fd);
	expect(mockFs.read.mock.calls[0][2]).toBe(0);
	expect(mockFs.read.mock.calls[0][3]).toBe(4);
	expect(mockFs.read.mock.calls[0][4]).toBe(0);
});

test('Use cached data', async () => {
	const c = new CachedRead(123, 4);
	mockFs.read.mockImplementationOnce((fd, buffer, offset, length, position, cb) => {
		for (let i = 0; i < length; i++) buffer[i] = i % 256;
		cb(null, length, buffer);
	});
	const d1 = await c.read(0, 2);
	expect(d1.toString('hex')).toEqual('0001');
	const d2 = await c.read(2, 2);
	expect(mockFs.read.mock.calls.length).toBe(1);
	expect(d2.toString('hex')).toEqual('0203');
});

test('Read further data', async () => {
	const size = 3;
	const c = new CachedRead(123, size);
	mockFs.read.mockImplementation((fd, buffer, offset, length, position, cb) => {
		for (let i = 0; i < length; i++) buffer[i] = (i + position) % 256;
		cb(null, length, buffer);
	});
	const d1 = await c.read(1, 2);
	expect(d1.toString('hex')).toEqual('0102');
	const d2 = await c.read(3, 2);
	expect(mockFs.read.mock.calls[1][2]).toBe(0);
	expect(mockFs.read.mock.calls[1][3]).toBe(size);
	expect(mockFs.read.mock.calls[1][4]).toBe(3);
	expect(d2.toString('hex')).toEqual('0304');
});

test('Read more data than cached', async () => {
	const size = 3;
	const c = new CachedRead(123, size);
	const d = await c.read(0, size + 1);
	expect(d.length).toBe(size + 1);
});

test('Jump backwards in file', async () => {
	const c = new CachedRead();
	await c.read(2, 2);
	await c.read(0, 2);
	expect(mockFs.read.mock.calls.length).toBe(2);
});

test('Do not read over EOF', async () => {
	const c = new CachedRead();
	mockFs.read.mockImplementation((fd, buffer, offset, length, position, cb) => {
		for (let i = 0; i < length; i++) buffer[i] = (i + position) % 256;
		cb(null, 1, buffer);
	});
	const d = await c.read(1, 2);
	expect(d.toString('hex')).toBe('01');
});
