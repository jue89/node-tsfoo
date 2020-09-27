const {Readable} = require('stream');

class ReadStream extends Readable {
	constructor (reader) {
		super({objectMode: true, highWaterMark: 16});
		this.reader = reader;
	}

	async _read () {
		// Stream one block
		// record may be an object or null if the end of the reader has beeen reached
		const record = await this.reader.read();
		this.push(record);
		// Close the resource ... older versions of Node doesn't call _destroy ...
		if (record === null) await this.reader.close();
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
