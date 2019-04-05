const fs = require('../wrapper/fs.js');

class CachedRead {
	constructor (fd, size = 40960) {
		this.fd = fd;
		this.size = size;
	}

	async read (offset, len) {
		const requestedStart = offset;
		const requestedEnd = requestedStart + len;
		if (!this.cache || requestedEnd > this.cachedEnd || requestedStart < this.cachedStart) {
			this.cache = Buffer.alloc(this.size > len ? this.size : len);
			this.cachedStart = requestedStart;
			const bytesRead = await fs.read(this.fd, this.cache, this.cachedStart);
			this.cachedEnd = this.cachedStart + bytesRead;
		}
		const sliceStart = requestedStart - this.cachedStart;
		const sliceEnd = (this.cachedEnd >= requestedEnd) ? sliceStart + len : this.cachedEnd - this.cachedStart;
		return this.cache.slice(sliceStart, sliceEnd);
	}
}

module.exports = CachedRead;
