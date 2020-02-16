const assert = require('assert');

class BlockAppender {
	constructor ({file, offset, blockSize}) {
		assert(file.size >= offset, 'File too short');
		this.file = file;
		this.blockSize = blockSize;
		this.offset = offset;
		this.ptr = this.size;
	}

	get size () {
		return Math.floor((this.file.size - this.offset) / this.blockSize);
	}

	async write (data) {
		assert(data.length === this.blockSize, 'Buffer has wrong length');
		const offset = this.offset + this.ptr * this.blockSize;
		this.file.write({offset, data});
		this.ptr++;
	}
}

module.exports = {BlockAppender};
