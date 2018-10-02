const stream = require('stream');
const getMetaByType = require('./meta.js').get;

class Multiplexer extends stream.Writable {
	constructor (db, getStreamCB) {
		super({objectMode: true});
		this.db = db;
		this.getStreamCB = getStreamCB;
		this.streams = {};
	}

	async _write (record, encoding, callback) {
		try {
			if (!this.streams[record.series]) {
				// This is the first record to this stream
				// Create a new stream on the fly ...
				this.streams[record.series] = await this.getStreamCB(record, this.db);
				this.streams[record.series].on('error', (err) => this.emit('internalError', err));
			}

			// Write record to the right series and wait for it to be written
			this.streams[record.series].write(record, () => callback(null));
		} catch (e) {
			// Silently hide errors
			this.emit('internalError', e);
			callback(null);
		}
	}

	_final (callback) {
		Object.keys(this.streams).forEach((key) => {
			this.streams[key].end();
		});
		callback();
	}
}

function create (db, getStreamCB) {
	if (typeof db === 'function') {
		getStreamCB = db;
		db = undefined;
	}

	if (getStreamCB === undefined) {
		// By default try to create a new write stream
		getStreamCB = async (record, db) => db.createWriteStream(record.series, {
			defaultMetaCode: await getMetaByType(typeof record.value)
		});
	}

	return new Multiplexer(db, getStreamCB);
};

module.exports = {create, Multiplexer};
