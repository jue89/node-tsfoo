const stream = require('stream');
const fs = require('../wrapper/fs.js');
const seriesOpen = require('./series.js').open;
const seriesCreate = require('./series.js').create;

const MINTS = Buffer.from([128, 0, 0, 0, 0, 0]).readIntBE(0, 6) - 1;

class WriteStream extends stream.Writable {
	constructor (seriesFile) {
		super({objectMode: true});
		Object.assign(this, seriesFile);
	}

	async _write (chunk, encoding, callback) {
		try {
			// Defaults
			if (typeof chunk !== 'object') chunk = {value: chunk};
			if (chunk.timestamp === undefined) chunk.timestamp = Date.now();

			// Convert timestamp to buffer
			const tsBuf = Buffer.alloc(this.header.tsLen);
			tsBuf.writeIntBE(chunk.timestamp, 0, tsBuf.length);

			// Convert data to buffer
			const itemBuf = this.meta.pack(chunk.value);
			if (itemBuf.length !== this.header.itemLen) throw new Error('Pack function returned an invalid buffer');

			// Write data to disk
			await fs.write(this.fd, Buffer.concat([tsBuf, itemBuf]), this.ptr);

			// We succeeded!
			this.ptr += this.recordLen;
			callback(null);
		} catch (e) {
			// Something went wrong ...
			callback(e);
		}
	}
}

async function create (path, opts = {}) {
	// Try to open series
	let seriesFile;
	try {
		seriesFile = await seriesOpen(path, (opts.waitForLock) ? 'w+' : 'w');
	} catch (e) {
		if (e.code !== 'ENOENT' || !opts.defaultMetaCode) throw e;
		await seriesCreate(path, opts.defaultMetaCode);
		seriesFile = await seriesOpen(path, (opts.waitForLock) ? 'w+' : 'w');
	}

	// Analyse file offsets and length
	const recordLen = seriesFile.header.tsLen + seriesFile.header.itemLen;
	const dataStart = seriesFile.header.dataStart;
	const dataLen = seriesFile.stat.size - dataStart;
	const recordCnt = Math.floor(dataLen / recordLen);

	// Read last timestamp if records are inside the series
	if (recordCnt > 0) {
		const lastTsData = Buffer.alloc(seriesFile.header.tsLen);
		await fs.read(seriesFile.fd, lastTsData, dataStart + (recordCnt - 1) * recordLen);
		seriesFile.lastTs = lastTsData.readIntBE(0, lastTsData.length);
	} else {
		seriesFile.lastTs = MINTS;
	}

	// Calc the position to write to the next record
	seriesFile.ptr = dataStart + recordCnt * recordLen;
	seriesFile.recordLen = recordLen;

	return new WriteStream(seriesFile);
}

module.exports = {create, WriteStream};
