const fs = require('../wrapper/fs.js');
const metaRead = require('./meta.js').read;
const headerGen = require('./header.js').gen;
const headerRead = require('./header.js').read;

module.exports = {create, open};

async function create (path, metaCode) {
	if (typeof path !== 'string') throw new Error('path must be a string');
	if (typeof metaCode !== 'string') throw new Error('metaCode must be a string');

	// Evaluate meta to lern item length and make sure everything required is given
	const meta = metaRead(metaCode);
	if (typeof meta.itemLen !== 'number') throw new Error('meta must export itemLen');
	if (typeof meta.pack !== 'function') throw new Error('meta must export function pack');
	if (typeof meta.unpack !== 'function') throw new Error('meta must export function unpack');

	// Create required buffers
	const header = headerGen({metaCode, itemLen: meta.itemLen});
	const data = Buffer.alloc(header.dataStart);
	header.data.copy(data, 0, 0);
	data.write(metaCode, header.metaStart);

	// Store empty series file
	// Open the file and make sure:
	// - We are the only one writing to it
	// - It is empty
	const fd = await fs.open(path, 'a');
	try {
		await fs.flock(fd, 'ex');
		const stat = await fs.fstat(fd);
		if (stat.size > 0) throw new Error('Series file is not empty');
		await fs.write(fd, data);
	} finally {
		await fs.close(fd);
	}

	return true;
}

async function open (path, mode) {
	if (typeof path !== 'string') throw new Error('path must be a string');
	if (typeof mode !== 'string') throw new Error('mode must be a string');
	if (['r', 'r+'].indexOf(mode) === -1) throw new Error('mode must be \'r\' or \'r+\'');

	const fd = await fs.open(path, mode);
	try {
		// Make sure we are the only one writing to the file
		if (mode === 'r+') await fs.flock(fd, 'ex');

		// Read header
		const headerData = Buffer.alloc(20);
		await fs.read(fd, headerData);
		const header = headerRead(headerData);

		// Read meta
		const metaLen = header.metaEnd - header.metaStart;
		const metaData = Buffer.alloc(metaLen);
		await fs.read(fd, metaData, header.metaStart);
		const meta = metaRead(metaData.toString());

		// Determine start position:
		// - Writing starts at the end of file
		// - Reading at the beginning of the data
		let pos;
		if (mode === 'r+') {
			const stat = await fs.fstat(fd);
			pos = stat.size;
		} else if (mode === 'r') {
			pos = header.dataStart;
		}

		return {fd, pos, header, meta};
	} catch (e) {
		await fs.close(fd);
		throw e;
	}
}
