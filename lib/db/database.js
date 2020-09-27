const {createReader, createWriter} = require('../series/index.js');
const {createReadStream, createWriteStream} = require('../stream/index.js');
const {Multiplexer} = require('./multiplexer.js');
const {Demultiplexer} = require('./demultiplexer.js');

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

	async createReader (seriesName, opts = {}) {
		if (Array.isArray(seriesName)) {
			const readers = await Promise.all(seriesName.map((seriesName) => {
				let localOpts = {};
				if (Array.isArray(seriesName)) {
					localOpts = seriesName[1] || {};
					seriesName = seriesName[0];
				}
				return createReader({
					...opts,
					...localOpts,
					dbName: this.dbName,
					seriesName: seriesName
				});
			}));
			return new Demultiplexer(readers);
		} else {
			return createReader({
				...opts,
				dbName: this.dbName,
				seriesName: seriesName
			});
		}
	}

	async createReadStream (seriesName, opts) {
		return createReadStream(await this.createReader(seriesName, opts));
	}
}

module.exports = {Database};
