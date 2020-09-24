const assert = require('assert');

class Multiplexer {
	constructor (createWriter) {
		this.createWriter = createWriter;
		this.writer = {};
	}

	async write (record) {
		assert(typeof record === 'object', `record must be an object`);
		assert(typeof record.series === 'string', `record.series must be a string`);

		if (!this.writer[record.series]) {
			// This is the first record to this writer
			// Create a new writer on the fly ...
			this.writer[record.series] = await this.createWriter(record.series);
		}

		// Write record to the right series and wait for it to be written
		await this.writer[record.series].write(record);
	}

	async close () {
		await Promise.all(Object.values(this.writer).map((w) => w.close()));
	}
}

module.exports = {Multiplexer};
