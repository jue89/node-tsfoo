const stream = require('stream');
const fs = require('../wrapper/fs.js');
const seriesOpen = require('./series.js').open;
const seriesCreate = require('./series.js').create;

class ReadStream extends stream.Readable {
	constructor (seriesFile) {
		super({objectMode: true});
		Object.assign(this, seriesFile);

		if (this.follow) {
			fs.watchFile(this.path, (stat) => {
				this.stat = stat;
				this._streamNextRecord();
			});
		}

		this.streaming = false;
		this.blocked = true;

		// Convert filter to buffer
		['from', 'to'].forEach((key) => {
			if (!this[key]) return;
			const buf = Buffer.alloc(this.header.tsLen);
			buf.writeIntBE(this[key], 0, buf.length);
			this[key] = buf;
		});
	}

	async _streamNextRecord () {
		// Make sure we are allowed to stream
		// and not blocked by backpreasure
		if (this.blocked) return;

		// Make sure no other record is in flight
		if (this.streaming) return;

		// Make sure we have blocks available
		if (this.follow) {
			// Dont stop ... just wait for further data
			if (this.stat.size < this.ptr + this.recordLen) return;
		} else {
			// Push null to mark end of stream
			if (this.stopAt < this.ptr + this.recordLen) {
				this.push(null);
				fs.unwatchFile(this.path);
				await fs.close(this.fd);
				return;
			}
		}

		// Stream one block!
		this.streaming = true;
		const record = Buffer.alloc(this.recordLen);
		await fs.read(this.fd, record, this.ptr);
		this.ptr += this.recordLen;
		const timestampBuf = record.slice(0, this.header.tsLen);
		if (
			(this.from === undefined || Buffer.compare(timestampBuf, this.from) > 0) &&
			(this.to === undefined || Buffer.compare(timestampBuf, this.to) <= 0)
		) {
			const timestamp = record.readIntBE(0, this.header.tsLen);
			const value = this.meta.unpack(record.slice(this.header.tsLen));
			const data = {timestamp, value};
			this.blocked = !this.push(data);
		}
		this.streaming = false;

		// Retrigger streaming
		this._streamNextRecord();
	}

	_read () {
		this.blocked = false;
		this._streamNextRecord();
	}
};

async function create (path, opts = {}) {
	// Try to open series
	let seriesFile;
	try {
		seriesFile = await seriesOpen(path, 'r');
	} catch (e) {
		if (e.code !== 'ENOENT' || !opts.defaultMetaCode) throw e;
		await seriesCreate(path, opts.defaultMetaCode);
		seriesFile = await seriesOpen(path, 'r');
	}

	// Set values to start off
	Object.assign(seriesFile, opts, {path});
	const dataStart = seriesFile.header.dataStart;
	const dataLen = seriesFile.stat.size - seriesFile.header.dataStart;
	const recordLen = seriesFile.header.tsLen + seriesFile.header.itemLen;
	seriesFile.ptr = dataStart;
	seriesFile.recordLen = recordLen;
	if (!opts.follow) {
		// Stop at the present postition of the file
		seriesFile.stopAt = dataStart + Math.floor(dataLen / recordLen) * recordLen;
	}

	return new ReadStream(seriesFile);
}

module.exports = {create, ReadStream};
