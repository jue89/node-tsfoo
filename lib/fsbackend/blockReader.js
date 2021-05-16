const assert = require('assert');

class BlockReader {
	constructor ({file, offset, blockSize}) {
		assert(file.size >= offset, 'File too short');
		this.file = file;
		this.offset = offset;
		this.blockSize = blockSize;
	}

	get size () {
		return Math.floor((this.file.size - this.offset) / this.blockSize);
	}

	async readBlock (n, {blocking = true, cached = true} = {}) {
		assert(typeof n === 'number', 'Block number required');
		const offset = this.offset + this.blockSize * n;
		const size = this.blockSize;
		if (cached) {
			return this.file.cachedRead({offset, size, blocking});
		} else {
			return this.file.read({offset, size, blocking});
		}
	}

	async bisectSearch (fn) {
		const size = this.size;
		if (size === 0) {
			return 0;
		} else {
			let left = 0;
			let right = this.size - 1;
			while (left < right) {
				const mid = Math.floor((left + right) / 2);
				const block = await this.readBlock(mid, {cached: false});
				const cmp = fn(block);
				if (cmp < 0) {
					right = mid - 1;
				} else if (cmp > 0) {
					left = mid + 1;
				} else {
					left = mid;
					right = mid;
				}
			}
			do {
				const block = await this.readBlock(left, {cached: false});
				const cmp = fn(block);
				if (cmp > 0) {
					left++;
					break;
				} else if (cmp < 0) {
					break;
				} else if (cmp === 0 && left > 0) {
					left--;
				}
			} while (left > 0);
			return left;
		}
	}
}

module.exports = {BlockReader};
