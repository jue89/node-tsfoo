const {readerFactory} = require('../reader.js');

const dbFactory = (size = 0) => {
	const db = {
		getSize: jest.fn(() => size),
		search: jest.fn(() => Promise.resolve(0)),
		read: jest.fn((n) => ({timestamp: n, value: 1000 * n})),
		write: jest.fn(),
		close: jest.fn(),
		openSeries: jest.fn(() => db)
	};
	return db;
};

test('open series', async () => {
	const db = dbFactory();
	const dbName = 'abc';
	const seriesName = 'def';
	await readerFactory(db.openSeries)({dbName, seriesName});
	expect(db.openSeries.mock.calls[0][0].dir).toBe(dbName);
	expect(db.openSeries.mock.calls[0][0].name).toBe(seriesName);
	expect(db.openSeries.mock.calls[0][0].access).toEqual('ro');
});

test('read from series', async () => {
	const db = dbFactory();
	const s = await readerFactory(db.openSeries)({});
	await expect(s.read()).resolves.toBe(db.read.mock.results[0].value);
	expect(db.read.mock.calls[0][0]).toBe(0);
	await expect(s.read()).resolves.toBe(db.read.mock.results[1].value);
	expect(db.read.mock.calls[1][0]).toBe(1);
});

test('read from a timestamp', async () => {
	const db = dbFactory();
	const from = 1234;
	const ptr = 42;
	db.search.mockReturnValueOnce(Promise.resolve(ptr));
	const s = await readerFactory(db.openSeries)({from});
	expect(db.search.mock.calls[0][0]).toBe(from);
	await s.read();
	expect(db.read.mock.calls[0][0]).toBe(ptr);
});

test('read to a timestamp', async () => {
	const db = dbFactory();
	const to = 1234;
	const s = await readerFactory(db.openSeries)({to});
	db.read.mockReturnValueOnce({timestamp: to - 1});
	await s.read();
	db.read.mockReturnValueOnce({timestamp: to});
	await expect(s.read()).rejects.toThrow('EOF');
});

test('do not follow new records', async () => {
	const db = dbFactory(1);
	const s = await readerFactory(db.openSeries)({follow: false});
	await s.read();
	await expect(s.read()).rejects.toThrow('EOF');
});

test('close series', async () => {
	const db = dbFactory();
	const s = await readerFactory(db.openSeries)({});
	await s.close();
	expect(db.close.mock.calls.length).toBe(1);
});
