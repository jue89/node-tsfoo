const {createReadStream, createWriteStream} = require('../stream/index.js');
const {Multiplexer} = require('./multiplexer.js');

class Database {
	constructor (dbName) {
		this.dbName = dbName;
		// TODO Install watch for rename events
	}

	createWriteStream (seriesName, opts = {}) {
		if (typeof seriesName !== 'string') {
			opts = seriesName;
			return new Multiplexer((seriesName) => this.createWriteStream(seriesName, opts));
		} else {
			return createWriteStream({
				...opts,
				dbName: this.dbName,
				seriesName: seriesName
			});
		}
	}

	createReadStream (seriesName, opts = {}) {
		return createReadStream({
			...opts,
			dbName: this.dbName,
			seriesName: seriesName
		});
	}
}

module.exports = {Database};
