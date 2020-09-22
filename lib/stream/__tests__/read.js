const {ReadStream} = require('../read.js');

test('enforce highWaterMark of 16', async () => {
	const record = {};
	const read = jest.fn(() => record);
	const r = new ReadStream({read});
	// Start reading
	r.once('readable', () => {});
	// Hacky trick to wait until reading has been blocked
	await new Promise((resolve) => setTimeout(resolve, 100));
	expect(read.mock.calls.length).toBe(16);
	expect(r.read()).toBe(record);
});

test('emit end event', async () => {
	const read = () => Promise.reject(new Error('EOF'));
	const close = jest.fn();
	const r = new ReadStream({read, close});
	const onEnd = jest.fn();
	r.on('end', onEnd);
	await new Promise((resolve) => r.once('readable', resolve));
	expect(onEnd.mock.calls.length).toBe(0);
	r.read();
	await new Promise((resolve) => setImmediate(resolve));
	expect(onEnd.mock.calls.length).toBe(1);
	expect(close.mock.calls.length).toBeGreaterThan(0);
});

test('close stream on destroy', async () => {
	let closed = false;
	const close = () => { closed = true; };
	const r = new ReadStream({close});
	const onError = jest.fn();
	r.on('error', onError);
	const err = new Error('foo');
	r.destroy(err);
	await new Promise((resolve) => setImmediate(resolve));
	expect(closed).toBe(true);
	expect(onError.mock.calls[0][0]).toBe(err);
});
