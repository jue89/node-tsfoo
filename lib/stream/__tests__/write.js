const {WriteStream} = require('../write.js');

const nextLoop = () => new Promise((resolve) => setImmediate(resolve));

test('enforce highWaterMark of 16', () => {
	const write = jest.fn(() => new Promise(() => {}));
	const w = new WriteStream({write});
	const chunk = {};
	for (let i = 0; i < 18; i++) {
		if (i < 15) expect(w.write(chunk)).toBe(true);
		else expect(w.write(chunk)).toBe(false);
	}
	expect(write.mock.calls.length).toBe(1);
	expect(write.mock.calls[0][0]).toBe(chunk);
});

test('forward flush events', async () => {
	let writeCallback;
	const write = () => new Promise((resolve) => {
		writeCallback = resolve;
	});
	const w = new WriteStream({write});
	const cb = jest.fn();
	w.write({}, cb);
	expect(cb.mock.calls.length).toBe(0);
	writeCallback();
	await nextLoop();
	expect(cb.mock.calls.length).toBe(1);
});

test('forward error events', async () => {
	let writeError;
	const write = () => new Promise((resolve, reject) => {
		writeError = reject;
	});
	const w = new WriteStream({write, close: () => {}});
	const onError = jest.fn();
	w.on('error', onError);
	const cb = jest.fn();
	w.write({}, cb);
	expect(cb.mock.calls.length).toBe(0);
	const err = new Error();
	writeError(err);
	await nextLoop();
	expect(cb.mock.calls.length).toBe(1);
	expect(onError.mock.calls[0][0]).toBe(err);
});

test('close stream on end', async () => {
	let closed = false;
	const close = () => { closed = true; };
	const w = new WriteStream({close});
	w.end();
	await nextLoop();
	expect(closed).toBe(true);
});

test('close stream on destroy', async () => {
	let closed = false;
	const close = () => { closed = true; };
	const w = new WriteStream({close});
	const onError = jest.fn();
	w.on('error', onError);
	const err = new Error('foo');
	w.destroy(err);
	await nextLoop();
	expect(closed).toBe(true);
	expect(onError.mock.calls[0][0]).toBe(err);
});
