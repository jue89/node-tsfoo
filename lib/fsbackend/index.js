const path = require('path');
const borc = require('borc');
const qsem = require('qsem');
const {File} = require('./file.js');
const {BlockReader} = require('./blockReader.js');
const {BlockAppender} = require('./blockAppender.js');

const MAGIC = Buffer.from('📈');
const BLOCKSIZE = 6 + 6 + 4;

async function open ({dir = '', name, access} = {}) {
	const idxFile = new File({path: path.join(dir, `idx-${name}`)});
	const datFile = new File({path: path.join(dir, `dat-${name}`)});

	try {
		// Open index file
		if (access === 'rw') {
			await idxFile.openReadWrite({blocking: true, create: true});
			// Write magic if the series files has been created newly
			if (idxFile.size === 0) await idxFile.write({offset: 0, data: MAGIC});
		} else {
			try {
				// First try to open the file read-write with non-blocking lock
				// obtaining. This ensures that the file exists. If we don't get
				// the file magic, some-else is on that file -> it exists!
				await idxFile.openReadWrite({blocking: false, create: true});
				// Write magic if the series files has been created newly
				if (idxFile.size === 0) await idxFile.write({offset: 0, data: MAGIC});
				// And close the file again ...
				await idxFile.close();
			} catch (e) {
				// NOP ... the file is closed due to the error
			}
			await idxFile.openRead();
		}

		// Check magic
		const magic = await idxFile.read({offset: 0, size: MAGIC.length, blocking: false});
		if (Buffer.compare(magic, MAGIC) !== 0) throw new Error('File magic is not matching!');

		// Open data file
		if (access === 'rw') {
			await datFile.openReadWrite({blocking: true, create: true});
		} else {
			try {
				// First try to open the file read-write with non-blocking lock
				// obtaining. This ensures that the file exists. If we don't get
				// the file magic, some-else is on that file -> it exists!
				await datFile.openReadWrite({blocking: false, create: true});
				// And close the file again ...
				await datFile.close();
			} catch (e) {
				// NOP ... the file is closed due to the error
			}
			await datFile.openRead();
		}
	} catch (err) {
		idxFile.close();
		datFile.close();
		throw err;
	}

	// Init block helper
	const idxReader = new BlockReader({file: idxFile, offset: MAGIC.length, blockSize: BLOCKSIZE});
	const idxAppender = new BlockAppender({file: idxFile, offset: MAGIC.length, blockSize: BLOCKSIZE});

	// Init semaphore for write limiting
	const writeSem = qsem(1);

	async function read (n, {blocking = true} = {}) {
		// Read index
		const idx = await idxReader.readBlock(n, {blocking});
		const timestamp = idx.readUIntBE(0, 6);
		const offset = idx.readUIntBE(6, 6);
		const size = idx.readUIntBE(12, 4);

		// Read data
		const dat = await datFile.cachedRead({offset, size, blocking: true});
		const value = borc.decodeFirst(dat);

		return {timestamp, value};
	}

	async function search (ts) {
		const tsBuf = Buffer.allocUnsafe(6);
		tsBuf.writeUIntBE(ts, 0, 6);
		const fn = (block) => Buffer.compare(tsBuf, block.slice(0, 6));
		return idxReader.bisectSearch(fn);
	}

	async function write ({timestamp, value}) {
		// convert value to buffer
		const data = borc.encode(value);

		// Write data one by one
		await writeSem.limit(async () => {
			// Write data
			const {offset, size} = await datFile.write({data});

			// Write index
			const idx = Buffer.allocUnsafe(BLOCKSIZE);
			idx.writeUIntBE(timestamp, 0, 6);
			idx.writeUIntBE(offset, 6, 6);
			idx.writeUIntBE(size, 12, 4);
			await idxAppender.write(idx);
		});
	}

	function getSize () {
		return idxReader.size;
	}

	async function close () {
		await datFile.close();
		await idxFile.close();
	}

	return {read, search, write, getSize, close};
};

module.exports = {open, MAGIC, BLOCKSIZE};
