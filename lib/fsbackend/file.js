const assert = require('assert');
const fs = require('fs');
const fsExt = require('fs-ext');
const util = require('util');
const events = require('events');

const open = util.promisify(fs.open);
const stat = util.promisify(fs.stat);
const close = util.promisify(fs.close);
const access = util.promisify(fs.access);
const fsync = util.promisify(fs.fsync);
const read = (fd, size, position) => new Promise((resolve, reject) => {
	fs.read(fd, Buffer.allocUnsafe(size), 0, size, position, (err, bytesRead, buffer) => {
		if (err) reject(err);
		else resolve(buffer.slice(0, bytesRead));
	});
});
const write = (fd, buffer, position) => new Promise((resolve, reject) => {
	fs.write(fd, buffer, 0, buffer.length, position, (err, bytesWritten) => {
		if (err) reject(err);
		else resolve(bytesWritten);
	});
});
const flock = util.promisify(fsExt.flock);
const exists = async (path) => {
	try {
		await access(path, fs.constants.F_OK);
		return true;
	} catch (e) {
		return false;
	}
};

class File extends events.EventEmitter {
	constructor ({path, syncWrites} = {}) {
		super();
		this.path = path;
		this.syncWrites = syncWrites;
		this.cacheOffset = 0;
		this.cacheBuffer = Buffer.alloc(0);
		this._size = 0;
	}

	set size (size) {
		this._size = size;
		this.emit('change');
	}

	get size () {
		return this._size;
	}

	async openRead () {
		assert(this.state === undefined, 'File already opened');

		// Open file
		this.fd = await open(this.path, 'r');
		this.state = 'ro';

		try {
			// Update size on change
			this.fileWatcher = fs.watch(this.path, async () => {
				const stats = await stat(this.path);
				if (stats.size === this.size) return;
				this.size = stats.size;
			});

			// Get current file length
			const stats = await stat(this.path);
			this.size = stats.size;
		} catch (err) {
			await this.close();
			throw err;
		}
	}

	async openReadWrite ({blocking, create} = {}) {
		// Open file
		// 'r+': Open file for reading and writing. An exception occurs if the file does not exist.
		//       -> Always if create === false
		// 'w+': Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
		//       -> Only if create === true and the file is not existing
		const mode = (!create || await exists(this.path)) ? 'r+' : 'w+';
		this.fd = await open(this.path, mode);
		this.state = 'rw';

		try {
			// Get file lock
			await flock(this.fd, (blocking) ? 'ex' : 'exnb');

			// Get current file length
			const stats = await stat(this.path);
			this.size = stats.size;
		} catch (err) {
			await this.close();
			throw err;
		}
	}

	async read ({offset = 0, size, blocking, minSize} = {}) {
		assert(this.state !== undefined, 'File not opened');
		assert(size !== undefined, 'Size argument is required');

		// Defaults
		if (minSize === undefined) minSize = size;

		while (1) {
			// File has enough bytes to read
			if (this.size >= minSize + offset) break;

			// We shall not wait until enough data is readable
			if (!blocking) throw new Error('Out of bounds');

			// Wait for signal of file size change
			await new Promise((resolve) => this.once('change', resolve));
		}
		return read(this.fd, size, offset);
	}

	async cachedRead ({offset, size, blocking, readAhead = 1024 * 1024} = {}) {
		assert(size !== undefined, 'Size argument is required');

		// Check if requested chunk is available in cache
		const from = offset - this.cacheOffset;
		const to = from + size;
		if (from >= 0 && to <= this.cacheBuffer.length) {
			return this.cacheBuffer.slice(from, to);
		}

		// Read
		this.cacheBuffer = await this.read({offset, size: readAhead, minSize: size, blocking});
		this.cacheOffset = offset;
		return this.cacheBuffer.slice(0, size);
	}

	async write ({offset, data} = {}) {
		assert(this.state === 'rw', 'File must be opened with write access');
		assert(data instanceof Buffer, 'data must be Buffer');

		// Defaults
		if (offset === undefined) offset = this.size;

		// Write data and keep track of file length
		const bytesWritten = await write(this.fd, data, offset);
		if (this.syncWrites) await fsync(this.fd);
		this.size = Math.max(this.size, offset + bytesWritten);

		// Make sure the whole buffer has been written
		if (bytesWritten !== data.length) throw new Error('Partial write');

		return {offset, size: bytesWritten};
	}

	async close () {
		if (this.state === 'ro') {
			delete this.state;
			if (this.fileWatcher) {
				this.fileWatcher.unwatch();
			};
			await close(this.fd);
		} else if (this.state === 'rw') {
			delete this.state;
			await close(this.fd);
		}
	}
}

module.exports = {File};
