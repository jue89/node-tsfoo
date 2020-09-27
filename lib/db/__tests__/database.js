jest.mock('../../series/index.js');
const mockSeries = require('../../series/index.js');

jest.mock('../../stream/index.js');
const mockStream = require('../../stream/index.js');

jest.mock('../multiplexer.js');
const mockMultiplexer = require('../multiplexer.js').Multiplexer;

jest.mock('../demultiplexer.js');
const mockDemultiplexer = require('../demultiplexer.js').Demultiplexer;

const {Database} = require('../database.js');

test('createWriter() with one stream', async () => {
	const dbName = 'foo';
	const db = new Database(dbName);
	const seriesName = 'baz';
	const writer = await db.createWriter(seriesName);
	expect(mockSeries.createWriter.mock.calls[0][0]).toMatchObject({
		dbName,
		seriesName
	});
	expect(writer).toBe(mockSeries.createWriter.mock.results[0].value);
});

test('createWriter() with multiple streams', async () => {
	const dbName = 'foo';
	const db = new Database(dbName);
	const multiplexer = await db.createWriter();
	expect(multiplexer).toBe(mockMultiplexer.mock.instances[0]);
	const seriesName = 'baz';
	const writer = await mockMultiplexer.mock.calls[0][0](seriesName);
	expect(mockSeries.createWriter.mock.calls[0][0]).toMatchObject({
		dbName,
		seriesName
	});
	expect(writer).toBe(mockSeries.createWriter.mock.results[0].value);
});

test('createWriteStream()', async () => {
	const db = new Database();
	const seriesName = 'abc';
	const writer = await db.createWriteStream(seriesName);
	expect(mockSeries.createWriter.mock.calls[0][0]).toMatchObject({seriesName});
	expect(mockStream.createWriteStream.mock.calls[0][0]).toBe(mockSeries.createWriter.mock.results[0].value);
	expect(writer).toBe(mockStream.createWriteStream.mock.instances[0]);
});

test('createReader() with one stream', async () => {
	const dbName = 'foo';
	const db = new Database(dbName);
	const seriesName = 'baz';
	const opts = {abc: true};
	const writer = await db.createReader(seriesName, opts);
	expect(mockSeries.createReader.mock.calls[0][0]).toMatchObject({
		...opts,
		dbName,
		seriesName
	});
	expect(writer).toBe(mockSeries.createReader.mock.results[0].value);
});

test('createReader() with multiple streams', async () => {
	const dbName = 'foo';
	const db = new Database(dbName);
	const seriesNameA = 'baz';
	const seriesNameB = 'bar';
	const opts = {abc: true};
	const optsB = {abc: false}; // Overwrites opts
	const reader = await db.createReader([
		seriesNameA,
		[seriesNameB, optsB]
	], opts);
	expect(mockSeries.createReader.mock.calls[0][0]).toMatchObject({
		...opts,
		dbName,
		seriesName: seriesNameA
	});
	expect(mockSeries.createReader.mock.calls[1][0]).toMatchObject({
		...optsB,
		dbName,
		seriesName: seriesNameB
	});
	expect(mockDemultiplexer.mock.calls[0][0][0]).toBe(mockSeries.createReader.mock.results[0].value);
	expect(mockDemultiplexer.mock.calls[0][0][1]).toBe(mockSeries.createReader.mock.results[1].value);
	expect(reader).toBe(mockDemultiplexer.mock.instances[0]);
});

test('createReadStream()', async () => {
	const db = new Database();
	const seriesName = 'abc';
	const reader = await db.createReadStream(seriesName);
	expect(mockSeries.createReader.mock.calls[0][0]).toMatchObject({seriesName});
	expect(mockStream.createReadStream.mock.calls[0][0]).toBe(mockSeries.createReader.mock.results[0].value);
	expect(reader).toBe(mockStream.createReadStream.mock.instances[0]);
});
