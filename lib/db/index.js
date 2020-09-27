const fs = require('fs');
const util = require('util');
const {Database} = require('./database.js');

const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);

async function openDB (dbName) {
	// Check if base is a dir and create it if it is not existing
	try {
		const s = await stat(dbName);
		if (!s.isDirectory()) throw new Error('Given path is not a directory');
	} catch (e) {
		if (e.code !== 'ENOENT') throw e;
		await mkdir(dbName);
	}

	return new Database(dbName);
}

module.exports = {openDB};
