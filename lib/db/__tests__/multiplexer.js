const {Multiplexer} = require('../multiplexer.js');
const {EventEmitter} = require('events');

const nextLoop = () => new Promise((resolve) => setImmediate(resolve));
const createWriteStream = () => jest.fn(() => ({
	write: jest.fn(),
	close: jest.fn()
}));

test('create new writer', async () => {
	const s = createWriteStream();
	const m = new Multiplexer(s);
	const seriesName = 'abc';
	const record = {series: seriesName, value: true};
	await m.write(record);
	expect(s.mock.calls[0][0]).toBe(seriesName);
	expect(s.mock.results[0].value.write.mock.calls[0][0]).toBe(record);
});

test('enforce record format', async () => {
	const m = new Multiplexer();
	await expect(() => m.write(123)).rejects.toThrow('record must be an object');
	await expect(() => m.write({value: 'abc'})).rejects.toThrow('record.series must be a string');
});

test('close writers', async () => {
	const s = createWriteStream();
	const m = new Multiplexer(s);
	await m.write({series: 'abc'});
	await m.close();
	expect(s.mock.results[0].value.close.mock.calls.length).toBe(1);
});
