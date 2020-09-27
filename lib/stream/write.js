const {Writable} = require('stream');

class WriteStream extends Writable {
	constructor (writer) {
		super({objectMode: true, highWaterMark: 16});
		this.writer = writer;
	}

	async _write (chunk, encoding, callback) {
		try {
			await this.writer.write(chunk);
			callback(null);
		} catch (e) {
			callback(e);
		}
	}

	async _final (callback) {
		try {
			await this.writer.close();
			callback(null);
		} catch (e) {
			callback(e);
		}
	}

	async _destroy (err, callback) {
		try {
			await this.writer.close();
			callback(err || null);
		} catch (e) {
			callback(e);
		}
	}
}

module.exports = {WriteStream};
