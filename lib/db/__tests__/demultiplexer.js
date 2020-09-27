const {Demultiplexer} = require('../demultiplexer.js');

const blk = () => Promise.reject(new Error('Would block'));

class DeferredRead {
	constructor () {
		this.q = new Promise((resolve) => {
			this.resolve = resolve;
		});
	}
};

const readerFactory = (readers) => readers.map((values) => {
	const read = ({blocking}) => {
		const nextValue = values[0];

		if (nextValue instanceof Promise) {
			values.shift();
			return nextValue;
		} else if (nextValue instanceof DeferredRead) {
			if (!blocking) return blk();
			values.shift();
			return nextValue.q;
		} else {
			values.shift();
			return Promise.resolve(nextValue);
		}
	};
	const close = jest.fn();
	return {read, close};
});

describe('read()', () => {
	test('bring readers in the right order', async () => {
		const demux = new Demultiplexer(readerFactory([
			[{timestamp: 9}, {timestamp: 10}, {timestamp: 12}, {timestamp: 13}, blk()],
			[{timestamp: 8}, {timestamp: 11}, blk(), blk(), blk()]
		]));

		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 8});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 9});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 10});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 11});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 12});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 13});
		await expect(demux.read({blocking: false})).rejects.toThrow('Would block');
	});

	test('read until end', async () => {
		const demux = new Demultiplexer(readerFactory([
			[{timestamp: 9}, {timestamp: 10}, {timestamp: 12}, {timestamp: 13}, null],
			[{timestamp: 8}, {timestamp: 11}, null]
		]));

		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 8});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 9});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 10});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 11});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 12});
		await expect(demux.read({blocking: false})).resolves.toMatchObject({timestamp: 13});
		await expect(demux.read({blocking: false})).resolves.toBe(null);
	});

	test('read blocking', async () => {
		const deferredA = new DeferredRead();
		const deferredB = new DeferredRead();
		const deferredC = new DeferredRead();
		const demux = new Demultiplexer(readerFactory([
			[{timestamp: 9}, {timestamp: 10}, deferredA, null],
			[{timestamp: 8}, {timestamp: 11}, deferredB, deferredC, null]
		]));

		// Concurrent falls with existing calls
		await expect(Promise.all([
			demux.read(),
			demux.read(),
			demux.read(),
			demux.read()
		])).resolves.toMatchObject([
			{timestamp: 8},
			{timestamp: 9},
			{timestamp: 10},
			{timestamp: 11}
		]);

		// Concurrent calls waiting for promises
		const readA = demux.read();
		const readB = demux.read();
		deferredA.resolve({timestamp: 12});
		await expect(readA).resolves.toMatchObject({timestamp: 12});
		deferredB.resolve({timestamp: 13});
		await expect(readB).resolves.toMatchObject({timestamp: 13});

		// Read after resolve
		deferredC.resolve({timestamp: 14});
		await expect(demux.read()).resolves.toMatchObject({timestamp: 14});

		await expect(demux.read()).resolves.toBe(null);
	});

	test('read mixed blocking and non-blocking', async () => {

	});

	test('close readers', async () => {
		const readers = readerFactory([[null], [{timestamp: 1}]]);
		const demux = new Demultiplexer(readers);
		await expect(demux.read()).resolves.toMatchObject({timestamp: 1});
		await demux.close();
		readers.forEach(({close}) => expect(close.mock.calls.length).toBe(1));
	});
});
