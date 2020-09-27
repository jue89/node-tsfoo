const qsem = require('qsem');

class Demultiplexer {
	constructor (readers) {
		this.readers = readers.map((reader) => ({reader, pending: true}));
		this.readSem = qsem(1);
	}

	read ({blocking = true} = {}) {
		// Only one reader may enter this section.
		// Otherwise, two readers will wait for the same read call.
		return this.readSem.limit(() => this._read({blocking}));
	}

	async _read ({blocking}) {
		// Try to get values form readers non-blocking
		const results = await Promise.allSettled(this.readers.map(({reader, pending, value, promise}) => {
			// Skip closed, non-pending readers or those that are listening for a value
			if (value === null || !pending || promise) return Promise.reject(new Error('NOP'));
			return reader.read({blocking: false});
		}));

		// Extract values that returned a record
		results.forEach(({status, value}, n) => {
			if (status !== 'fulfilled') return;
			this.readers[n].pending = false;
			this.readers[n].value = value;
		});

		// Filter out closed readers
		const activeReaders = this.readers.filter(({value}) => value !== null);
		if (activeReaders.length === 0) return null;

		// Try to find the reader with the lowest timestamp
		const nonpending = activeReaders.filter(({pending}) => !pending);
		if (nonpending.length > 0) {
			const candidate = nonpending.sort((a, b) => a.value.timestamp - b.value.timestamp)[0];
			candidate.pending = true;
			return candidate.value;
		}

		// No values and not waiting for values ...
		if (!blocking) {
			throw new Error('Would block');
		}

		// Setup promises
		activeReaders.forEach((obj, n) => {
			if (obj.promise) return;
			obj.promise = obj.reader.read({blocking: true});
			obj.promise.then((value) => {
				obj.value = value;
				obj.pending = false;
				delete obj.promise;
			});
		});

		// Wait for any promise to resolve
		await Promise.race(activeReaders.map((r) => r.promise));

		// At least one value is available at this point!
		return this._read({blocking});
	}

	close () {
		return Promise.all(this.readers.map(({reader}) => reader.close()));
	}
}

module.exports = {Demultiplexer};
