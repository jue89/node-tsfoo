const {Multiplexer} = require('../multiplexer.js');
const {EventEmitter} = require('events');

const nextLoop = () => new Promise((resolve) => setImmediate(resolve));
const createWriteStream = () => jest.fn(() => {
	const s = new EventEmitter();
	s.write = jest.fn((record, cb) => cb());
	s.end = jest.fn();
	return s;
});

test('create new stream', async () => {
	const s = createWriteStream();
	const m = new Multiplexer(s);
	const seriesName = 'abc';
	const record = {series: seriesName, value: true};
	const cb = jest.fn();
	m.write(record, cb);
	await nextLoop();
	expect(s.mock.calls[0][0]).toBe(seriesName);
	expect(s.mock.results[0].value.write.mock.calls[0][0]).toBe(record);
	expect(cb.mock.calls.length).toBe(1);
});

test('enforce record format', async () => {
	const m = new Multiplexer();
	const onError = jest.fn();
	m.on('internalError', onError);
	m.write(123);
	await nextLoop();
	expect(onError.mock.calls[0][0].message).toEqual(`record must be an object`);
	m.write({value: 'abc'});
	await nextLoop();
	expect(onError.mock.calls[1][0].message).toEqual(`record.series must be a string`);
});

test('forward errors', async () => {
	const s = createWriteStream();
	const m = new Multiplexer(s);
	m.write({series: 'abc'});
	await nextLoop();
	const onError = jest.fn();
	m.on('internalError', onError);
	const err = new Error();
	s.mock.results[0].value.emit('error', err);
	expect(onError.mock.calls[0][0]).toBe(err);
});

test('close streams', async () => {
	const s = createWriteStream();
	const m = new Multiplexer(s);
	m.write({series: 'abc'});
	m.end();
	await nextLoop();
	expect(s.mock.results[0].value.end.mock.calls.length).toBe(1);
});
