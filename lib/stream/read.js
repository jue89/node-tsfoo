const {Readable} = require('stream');

class ReadStream extends Readable {
	constructor (reader) {
		super({objectMode: true, highWaterMark: 16});
		this.reader = reader;
	}

	async _read () {
		try {
			// Stream one block
			const record = await this.reader.read();
			this.push(record);
		} catch (err) {
			// An error is emitted when EOF is reached
			// End the stream ...
			this.push(null);
			await this.reader.close();
		}
	}

	async _destroy (err, callback) {
		try {
			await this.reader.close();
			callback(err || null);
		} catch (e) {
			callback(e);
		}
	}
};

module.exports = {ReadStream};
