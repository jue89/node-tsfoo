const assert = require('assert');
const {Writable} = require('stream');

class Multiplexer extends Writable {
	constructor (createWriteSteam) {
		super({objectMode: true});
		this.createWriteSteam = createWriteSteam;
		this.streams = {};
	}

	async _write (record, encoding, callback) {
		try {
			assert(typeof record === 'object', `record must be an object`);
			assert(typeof record.series === 'string', `record.series must be a string`);

			if (!this.streams[record.series]) {
				// This is the first record to this stream
				// Create a new stream on the fly ...
				this.streams[record.series] = await this.createWriteSteam(record.series);
				this.streams[record.series].on('error', (err) => this.emit('internalError', err));
			}

			// Write record to the right series and wait for it to be written
			this.streams[record.series].write(record, () => callback(null));
		} catch (err) {
			// Silently hide errors
			this.emit('internalError', err);
			callback(null);
		}
	}

	_final (callback) {
		Object.values(this.streams).forEach((stream) => stream.end());
		callback();
	}
}

module.exports = {Multiplexer};
