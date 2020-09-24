const {createReader, createWriter} = require('../series/index.js');
const {createReadStream, createWriteStream} = require('../stream/index.js');
const {Multiplexer} = require('./multiplexer.js');

class Database {
	constructor (dbName) {
		this.dbName = dbName;
		// TODO Install watch for rename events
	}

	async createWriter (seriesName) {
		if (typeof seriesName !== 'string') {
			return new Multiplexer((seriesName) => this.createWriter(seriesName));
		} else {
			return createWriter({
				dbName: this.dbName,
				seriesName: seriesName
			});
		}
	}

	async createWriteStream (seriesName) {
		return createWriteStream(await this.createWriter(seriesName));
	}

	createReader (seriesName, opts = {}) {
		return createReader({
			...opts,
			dbName: this.dbName,
			seriesName: seriesName
		});
	}

	async createReadStream (seriesName, opts) {
		return createReadStream(await this.createReader(seriesName, opts));
	}
}

module.exports = {Database};
