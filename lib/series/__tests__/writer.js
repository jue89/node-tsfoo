const {writerFactory} = require('../writer.js');

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

test('open empty series', async () => {
	const db = dbFactory(0);
	const dbName = 'abc';
	const seriesName = 'def';
	await writerFactory(db.openSeries)({dbName, seriesName});
	expect(db.openSeries.mock.calls[0][0].dir).toBe(dbName);
	expect(db.openSeries.mock.calls[0][0].name).toBe(seriesName);
	expect(db.openSeries.mock.calls[0][0].access).toEqual('rw');
	expect(db.read.mock.calls.length).toBe(0);
});

test('open existing series', async () => {
	const db = dbFactory(2);
	const timestamp = 1234;
	db.read.mockReturnValue(Promise.resolve({timestamp}));
	await writerFactory(db.openSeries)({});
	expect(db.read.mock.calls[0][0]).toBe(1);
});

test('enforce monotonically increasing timestamps (empty series)', async () => {
	const db = dbFactory(0);
	const s = await writerFactory(db.openSeries)({});
	const r0 = {timestamp: -1, value: {}};
	await expect(s.write(r0)).rejects.toThrow('Timestamp must be at least 0');
	const r1 = {timestamp: 0, value: {}};
	await s.write(r1);
	await expect(s.write(r0)).rejects.toThrow('Timestamp must be at least 0');
	expect(db.write.mock.calls.length).toBe(1);
	expect(db.write.mock.calls[0][0]).toBe(r1);
});

test('enforce monotonically increasing timestamps (existing series)', async () => {
	const db = dbFactory(2);
	const timestamp = 1234;
	db.read.mockReturnValue(Promise.resolve({timestamp}));
	const s = await writerFactory(db.openSeries)({});
	const r0 = {timestamp: timestamp - 1, value: {}};
	await expect(s.write(r0)).rejects.toThrow('Timestamp must be at least 1234');
});

test('set default timestamp', async () => {
	const db = dbFactory();
	const timestamp = 567;
	const getTimestamp = jest.fn(() => timestamp);
	const s = await writerFactory(db.openSeries, getTimestamp)({});
	const r = {value: {}};
	await s.write(r);
	expect(db.write.mock.calls[0][0].value).toBe(r.value);
	expect(db.write.mock.calls[0][0].timestamp).toBe(timestamp);
});

test('convert value to record', async () => {
	const db = dbFactory();
	let ts = 123;
	const s = await writerFactory(db.openSeries, () => ts++)({});
	for (const [n, v] of [true, false, 123, NaN].entries()) {
		await s.write(v);
		expect(db.write.mock.calls[n][0].value).toBe(v);
	}
});

test('close series', async () => {
	const db = dbFactory();
	const s = await writerFactory(db.openSeries)({});
	await s.close();
	expect(db.close.mock.calls.length).toBe(1);
});
