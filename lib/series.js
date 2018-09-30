const fs = require('fs');
const fsOpen = (path, mode) => new Promise((resolve, reject) => fs.open(path, mode, (err, fd) => {
	if (err) reject(err);
	else resolve(fd);
}));
const fsWrite = (fd, data, pos = 0) => new Promise((resolve, reject) => fs.write(fd, data, 0, data.length, pos, (err) => {
	if (err) reject(err);
	else resolve();
}));
const fsRead = (fd, buffer, pos = 0) => new Promise((resolve, reject) => fs.read(fd, buffer, 0, buffer.length, pos, (err) => {
	if (err) reject(err);
	else resolve();
}));
const fsFstat = (fd) => new Promise((resolve, reject) => fs.fstat(fd, (err, stat) => {
	if (err) reject(err);
	else resolve(stat);
}));

const metaRead = require('./meta.js').read;
const headerGen = require('./header.js').gen;
const headerRead = require('./header.js').read;

module.exports = { create, open };
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
	const fd = await fsOpen(path, 'w');
	await fsWrite(fd, data);

	return { fd, pos: header.dataStart, header, meta };
}

async function open (path, mode) {
	if (typeof path !== 'string') throw new Error('path must be a string');
	if (typeof mode !== 'string') throw new Error('mode must be a string');
	if (['r', 'r+'].indexOf(mode) === -1) throw new Error('mode must be \'r\' or \'r+\'');

	const fd = await fsOpen(path, mode);

	// Read header
	const headerData = Buffer.alloc(20);
	await fsRead(fd, headerData);
	const header = headerRead(headerData);

	// Read meta
	const metaLen = header.metaEnd - header.metaStart;
	const metaData = Buffer.alloc(metaLen);
	await fsRead(fd, metaData, header.metaStart);
	const meta = metaRead(metaData.toString());

	// Determine start position:
	// - Writing starts at the end of file
	// - Reading at the beginning of the data
	let pos;
	if (mode === 'r+') {
		const stat = await fsFstat(fd);
		pos = stat.size;
	} else if (mode === 'r') {
		pos = header.dataStart;
	}

	return {fd, pos, header, meta};
}
