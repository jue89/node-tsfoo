const path = require('path');
const fs = require('./wrapper/fs.js');
const createWritable = require('./lib/writable.js').create;
const createReadable = require('./lib/readable.js').create;

class Database {
	constructor (base) {
		this.base = base;
		// TODO Install watch for rename events
	}

	// TODO Get info method

	createWriteStream (series, opts) {
		return createWritable(path.join(this.base, series), opts);
	}

	createReadStream (series, opts) {
		return createReadable(path.join(this.base, series), opts);
	}
}

async function open (base) {
	// Check if base is a dir and create it if it is not existing
	try {
		const stat = await fs.stat(base);
		if (!stat.isDirectory()) throw new Error('Given path is not a directory');
	} catch (e) {
		if (e.code !== 'ENOENT') throw e;
		await fs.mkdir(base);
	}

	return new Database(base);
}

module.exports = {open, Database};
