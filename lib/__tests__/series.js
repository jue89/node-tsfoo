const {seriesReadFactory, seriesWriteFactory} = require('../series.js');

const dbFactory = (size = 0) => {
	const db = {
		size,
		search: jest.fn(() => Promise.resolve(0)),
		read: jest.fn((n) => ({timestamp: n, value: 1000 * n})),
		write: jest.fn(),
		close: jest.fn(),
		openSeries: jest.fn(() => db)
	};
	return db;
};

describe('seriesWrite', () => {
	test('open empty series', async () => {
		const db = dbFactory(0);
		const dbName = 'abc';
		const seriesName = 'def';
		await seriesWriteFactory(db.openSeries)({dbName, seriesName});
		expect(db.openSeries.mock.calls[0][0].dbName).toBe(dbName);
		expect(db.openSeries.mock.calls[0][0].seriesName).toBe(seriesName);
		expect(db.openSeries.mock.calls[0][0].access).toEqual('rw');
		expect(db.read.mock.calls.length).toBe(0);
	});

	test('open existing series', async () => {
		const db = dbFactory(2);
		const timestamp = 1234;
		db.read.mockReturnValue(Promise.resolve({timestamp}));
		await seriesWriteFactory(db.openSeries)({});
		expect(db.read.mock.calls[0][0]).toBe(1);
	});

	test('enforce strictly monotonically increasing timestamps (empty series)', async () => {
		const db = dbFactory(0);
		const s = await seriesWriteFactory(db.openSeries)({});
		const r0 = {timestamp: -1, value: {}};
		await expect(s.write(r0)).rejects.toThrow('Timestamp must be at least 0');
		const r1 = {timestamp: 0, value: {}};
		await s.write(r1);
		await expect(s.write(r1)).rejects.toThrow('Timestamp must be at least 1');
		expect(db.write.mock.calls.length).toBe(1);
		expect(db.write.mock.calls[0][0]).toBe(r1);
	});

	test('enforce strictly monotonically increasing timestamps (existing series)', async () => {
		const db = dbFactory(2);
		const timestamp = 1234;
		db.read.mockReturnValue(Promise.resolve({timestamp}));
		const s = await seriesWriteFactory(db.openSeries)({});
		const r0 = {timestamp: timestamp, value: {}};
		await expect(s.write(r0)).rejects.toThrow('Timestamp must be at least 1235');
	});

	test('set default timestamp', async () => {
		const db = dbFactory();
		const timestamp = 567;
		const getTimestamp = jest.fn(() => timestamp);
		const s = await seriesWriteFactory(db.openSeries, getTimestamp)({});
		const r = {value: {}};
		await s.write(r);
		expect(db.write.mock.calls[0][0].value).toBe(r.value);
		expect(db.write.mock.calls[0][0].timestamp).toBe(timestamp);
	});

	test('convert value to record', async () => {
		const db = dbFactory();
		let ts = 123;
		const s = await seriesWriteFactory(db.openSeries, () => ts++)({});
		for (const [n, v] of [null, undefined, true, false, 123, NaN].entries()) {
			await s.write(v);
			expect(db.write.mock.calls[n][0].value).toBe(v);
		}
	});

	test('close series', async () => {
		const db = dbFactory();
		const s = await seriesWriteFactory(db.openSeries)({});
		await s.close();
		expect(db.close.mock.calls.length).toBe(1);
	});
});

describe('seriesRead', () => {
	test('open series', async () => {
		const db = dbFactory();
		const dbName = 'abc';
		const seriesName = 'def';
		await seriesReadFactory(db.openSeries)({dbName, seriesName});
		expect(db.openSeries.mock.calls[0][0].dbName).toBe(dbName);
		expect(db.openSeries.mock.calls[0][0].seriesName).toBe(seriesName);
		expect(db.openSeries.mock.calls[0][0].access).toEqual('ro');
	});

	test('read from series', async () => {
		const db = dbFactory();
		const s = await seriesReadFactory(db.openSeries)({});
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
		const s = await seriesReadFactory(db.openSeries)({from});
		expect(db.search.mock.calls[0][0]).toBe(from);
		await s.read();
		expect(db.read.mock.calls[0][0]).toBe(ptr);
	});

	test('read to a timestamp', async () => {
		const db = dbFactory();
		const to = 1234;
		const s = await seriesReadFactory(db.openSeries)({to});
		db.read.mockReturnValueOnce({timestamp: to - 1});
		await s.read();
		db.read.mockReturnValueOnce({timestamp: to});
		await expect(s.read()).rejects.toThrow('EOF');
	});

	test('do not follow new records', async () => {
		const db = dbFactory(1);
		const s = await seriesReadFactory(db.openSeries)({follow: false});
		await s.read();
		await expect(s.read()).rejects.toThrow('EOF');
	});

	test('close series', async () => {
		const db = dbFactory();
		const s = await seriesReadFactory(db.openSeries)({});
		await s.close();
		expect(db.close.mock.calls.length).toBe(1);
	});
});
