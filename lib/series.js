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
	if (['r', 'w', 'w+'].indexOf(mode) === -1) throw new Error('mode must be r, w or w+');

	const fd = await fs.open(path, (mode[0] === 'w') ? 'r+' : 'r');
	try {
		// Make sure we are the only one writing to the file
		if (mode[0] === 'w') await fs.flock(fd, (mode[1] === '+') ? 'ex' : 'exnb');

		// Read header
		const headerData = Buffer.alloc(20);
		await fs.read(fd, headerData);
		const header = headerRead(headerData);

		// Read meta
		const metaLen = header.metaEnd - header.metaStart;
		const metaData = Buffer.alloc(metaLen);
		await fs.read(fd, metaData, header.metaStart);
		const meta = metaRead(metaData.toString());

		// Get file stat
		const stat = await fs.fstat(fd);

		return {fd, header, meta, stat};
	} catch (e) {
		await fs.close(fd);
		throw e;
	}
}
