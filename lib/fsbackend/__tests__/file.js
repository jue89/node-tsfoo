jest.mock('fs');
const mockFs = require('fs');

jest.mock('fs-ext');
const mockFsExt = require('fs-ext');

const nextLoop = () => new Promise((resolve) => setTimeout(resolve, 100));

const {File} = require('../file.js');

describe('File::openRead', () => {
	test('open file', async () => {
		const path = 'a/bc';
		const fd = 123;
		const size = 567;
		mockFs.open.mockImplementationOnce((p, m, cb) => cb(null, fd));
		mockFs.stat.mockImplementationOnce((p, cb) => cb(null, {size}));
		const f = new File({path});
		await f.openRead();
		expect(mockFs.open.mock.calls[0][0]).toEqual(path);
		expect(mockFs.open.mock.calls[0][1]).toEqual('r');
		expect(f.state).toEqual('ro');
		expect(f.fd).toBe(fd);
		expect(f.size).toBe(size);
	});

	test('update size and fire event', async () => {
		const path = 'a/bc';
		const size = 123;
		mockFs.stat.mockImplementationOnce((p, cb) => cb(null, {size}));
		const f = new File({path});
		await f.openRead();
		const onChange = jest.fn();
		f.on('change', onChange);
		expect(mockFs.watchFile.mock.calls[0][0]).toEqual(path);
		mockFs.watchFile.mock.calls[0][1]({size: size});
		expect(onChange.mock.calls.length).toBe(0);
		mockFs.watchFile.mock.calls[0][1]({size: size + 1});
		expect(onChange.mock.calls.length).toBe(1);
	});

	test('reject multiple open calls', async () => {
		const f = new File();
		await f.openRead();
		await expect(f.openRead()).rejects.toThrow('File already opened');
	});

	test('close on error', async () => {
		const err = new Error('nope');
		mockFs.stat.mockImplementationOnce((p, cb) => cb(err));
		const f = new File();
		await expect(f.openRead()).rejects.toBe(err);
		expect(f.state).toBeUndefined();
		expect(mockFs.close.mock.calls[0][0]).toBe(f.fd);
	});
});

describe('File::openReadWrite', () => {
	test('open with blocking file lock', async () => {
		const path = 'a/bc';
		const fd = 123;
		const size = 567;
		mockFs.open.mockImplementationOnce((p, m, cb) => cb(null, fd));
		mockFs.stat.mockImplementationOnce((p, cb) => cb(null, {size}));
		const f = new File({path});
		await f.openReadWrite({blocking: true});
		expect(mockFs.open.mock.calls[0][0]).toEqual(path);
		expect(mockFs.open.mock.calls[0][1]).toEqual('r+');
		expect(mockFsExt.flock.mock.calls[0][0]).toBe(fd);
		expect(mockFsExt.flock.mock.calls[0][1]).toEqual('ex');
		expect(f.fd).toBe(fd);
		expect(f.state).toEqual('rw');
		expect(f.size).toBe(size);
	});

	test('open with non-blocking file lock', async () => {
		const f = new File();
		await f.openReadWrite({blocking: false});
		expect(mockFsExt.flock.mock.calls[0][1]).toEqual('exnb');
	});

	test('create non-existing file', async () => {
		const path = 'abc';
		mockFs.access.mockImplementationOnce((p, m, cb) => cb(new Error()));
		const f = new File({path});
		await f.openReadWrite({blocking: false, create: true});
		expect(mockFs.access.mock.calls[0][0]).toEqual(path);
		expect(mockFs.access.mock.calls[0][1]).toBe(mockFs.constants.F_OK);
		expect(mockFs.open.mock.calls[0][1]).toEqual('w+');
	});

	test('open non-existing file', async () => {
		const path = 'abc';
		const f = new File({path});
		await f.openReadWrite({blocking: false, create: false});
		expect(mockFs.open.mock.calls[0][1]).toEqual('r+');
	});

	test('close on error', async () => {
		const err = new Error('nope');
		mockFs.stat.mockImplementationOnce((p, cb) => cb(err));
		const f = new File();
		await expect(f.openReadWrite()).rejects.toBe(err);
		expect(f.state).toBeUndefined();
		expect(mockFs.close.mock.calls[0][0]).toBe(f.fd);
	});
});

describe('File::read', () => {
	test('complain if file has not been opened', async () => {
		const f = new File();
		await expect(f.read()).rejects.toThrow('File not open');
	});

	test('read first bytes from file', async () => {
		const f = new File();
		await f.openRead();
		const size = 21;
		f.size = size;
		const buf = await f.read({size});
		expect(buf).toBeInstanceOf(Buffer);
		expect(buf.length).toBe(size);
		expect(mockFs.read.mock.calls[0][0]).toBe(f.fd);
		expect(mockFs.read.mock.calls[0][2]).toBe(0);
		expect(mockFs.read.mock.calls[0][3]).toBe(size);
		expect(mockFs.read.mock.calls[0][4]).toBe(0);
	});

	test('read arbitrary bytes from file', async () => {
		const f = new File();
		await f.openRead();
		const size = 21;
		const offset = 34;
		f.size = size + offset;
		const buf = await f.read({size, offset});
		expect(buf).toBeInstanceOf(Buffer);
		expect(mockFs.read.mock.calls[0][4]).toBe(offset);
		expect(buf.length).toBe(size);
	});

	test('wait for further data', async () => {
		const f = new File();
		await f.openRead();
		const size = 21;
		f.size = size - 2;
		const q = f.read({size, blocking: true});
		expect(mockFs.read.mock.calls.length).toBe(0);
		f.size = size - 1;
		f.emit('change');
		await nextLoop();
		expect(mockFs.read.mock.calls.length).toBe(0);
		f.size = size;
		f.emit('change');
		await nextLoop();
		expect(mockFs.read.mock.calls.length).toBe(1);
		expect((await q).length).toBe(size);
	});

	test('throw error if not enough data is available', async () => {
		const f = new File();
		await f.openRead();
		const size = 21;
		f.size = size - 1;
		return expect(f.read({size})).rejects.toThrow('Out of bounds');
	});

	test('read partial data', async () => {
		mockFs.read.mockImplementationOnce((f, b, o, s, p, cb) => cb(null, b.length - 1, b));
		const f = new File();
		await f.openRead();
		const size = 21;
		const offset = 1;
		f.size = size;
		const buf = await f.read({size, offset, minSize: size - 1});
		expect(buf.length).toBe(f.size - 1);
	});

	test('expect size argument', async () => {
		const f = new File();
		await f.openRead();
		return expect(f.read()).rejects.toThrow('Size argument is required');
	});
});

describe('File::cachedRead', () => {
	test('ensure size is given', async () => {
		const f = new File();
		await f.openRead();
		await expect(f.cachedRead()).rejects.toThrow('Size argument is required');
	});

	test('use cached data', async () => {
		const size = 4;
		mockFs.read.mockImplementationOnce((f, b, o, s, p, cb) => cb(null, 2 * size, b));
		const f = new File();
		await f.openRead();
		f.size = size * 2;
		const r0 = await f.cachedRead({offset: 0, size: size});
		expect(r0.length).toBe(size);
		const r1 = await f.cachedRead({offset: size, size: size});
		expect(r1.length).toBe(size);
		expect(mockFs.read.mock.calls.length).toBe(1);
		expect(mockFs.read.mock.calls[0][3]).toBe(1024 * 1024);
		await expect(f.cachedRead({offset: size, size: size + 1})).rejects.toThrow('Out of bounds');
		f.size = size * 2 + 1;
		await f.cachedRead({offset: size, size: size + 1});
		expect(mockFs.read.mock.calls.length).toBe(2);
	});
});

describe('File::write', () => {
	test('Make sure the file is opened for writing', async () => {
		const f = new File();
		f.openRead();
		return expect(f.write()).rejects.toThrow('File must be opened with write access');
	});

	test('Make sure a Buffer is stated', async () => {
		const f = new File();
		await f.openReadWrite();
		return expect(f.write()).rejects.toThrow('data must be Buffer');
	});

	test('Write data', async () => {
		const f = new File();
		await f.openReadWrite();
		const b0 = Buffer.alloc(4);
		const w0 = await f.write({data: b0});
		expect(mockFs.fsync.mock.calls.length).toBe(0);
		expect(mockFs.write.mock.calls[0][0]).toBe(f.fd);
		expect(mockFs.write.mock.calls[0][1]).toBe(b0);
		expect(mockFs.write.mock.calls[0][2]).toBe(0);
		expect(mockFs.write.mock.calls[0][3]).toBe(b0.length);
		expect(mockFs.write.mock.calls[0][4]).toBe(0);
		expect(w0.offset).toBe(0);
		expect(w0.size).toBe(b0.length);
		const b1 = Buffer.alloc(4);
		const w1 = await f.write({data: b1});
		expect(mockFs.write.mock.calls[1][0]).toBe(f.fd);
		expect(mockFs.write.mock.calls[1][1]).toBe(b1);
		expect(mockFs.write.mock.calls[0][2]).toBe(0);
		expect(mockFs.write.mock.calls[1][3]).toBe(b1.length);
		expect(mockFs.write.mock.calls[1][4]).toBe(b0.length);
		expect(w1.offset).toBe(b0.length);
		expect(w1.size).toBe(b1.length);
	});

	test('Write data in the middle of the file', async () => {
		const f = new File();
		await f.openReadWrite();
		f.size = 5;
		const b = Buffer.alloc(4);
		await f.write({data: b, offset: 0});
		expect(mockFs.write.mock.calls[0][1]).toBe(b);
		expect(mockFs.write.mock.calls[0][2]).toBe(0);
		expect(mockFs.write.mock.calls[0][3]).toBe(b.length);
		expect(mockFs.write.mock.calls[0][4]).toBe(0);
		expect(f.size).toBe(5);
	});

	test('Throw error on partial write', async () => {
		mockFs.write.mockImplementationOnce((f, b, o, s, p, cb) => cb(null, b.length - 1, b));
		const f = new File();
		await f.openReadWrite();
		const b = Buffer.alloc(4);
		await expect(f.write({data: b, offset: 0})).rejects.toThrow('Partial write');
		expect(f.size).toBe(b.length - 1);
	});

	test('Sync after write', async () => {
		const f = new File({syncWrites: true});
		await f.openReadWrite();
		await f.write({data: Buffer.alloc(4)});
		expect(mockFs.fsync.mock.calls[0][0]).toBe(f.fd);
	});
});

describe('File::close', () => {
	test('close ro file', async () => {
		const f = new File();
		f.fd = 123;
		f.state = 'ro';
		f.path = 'abc';
		f.watchFileListener = () => {};
		await f.close();
		expect(mockFs.close.mock.calls[0][0]).toBe(f.fd);
		expect(mockFs.unwatchFile.mock.calls[0][0]).toEqual(f.path);
		expect(mockFs.unwatchFile.mock.calls[0][1]).toBe(f.watchFileListener);
		expect(f.state).toBeUndefined();
	});

	test('close rw file', async () => {
		const f = new File();
		f.fd = 123;
		f.state = 'rw';
		await f.close();
		expect(mockFs.close.mock.calls[0][0]).toBe(f.fd);
		expect(f.state).toBeUndefined();
	});

	test('suppress mutliple close class', async () => {
		const f1 = new File();
		f1.state = 'ro';
		await Promise.all([f1.close(), f1.close()]);
		expect(mockFs.close.mock.calls.length).toBe(1);
		const f2 = new File();
		f2.state = 'rw';
		await Promise.all([f2.close(), f2.close()]);
		expect(mockFs.close.mock.calls.length).toBe(2);
	});
});
