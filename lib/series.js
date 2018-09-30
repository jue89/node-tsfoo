const fs = require('fs');
const fsOpen = (path, mode) => new Promise((resolve, reject) => fs.open(path, mode, (err, fd) => {
	if (err) reject(err);
	else resolve(fd);
}));
const fsWrite = (fd, data) => new Promise((resolve, reject) => fs.write(fd, data, (err) => {
	if (err) reject(err);
	else resolve();
}));
/* const fsClose = (fd) => new Promise((resolve, reject) => fs.close(fd, (err) => {
	if (err) reject(err);
	else resolve();
})); */

const metaRead = require('./meta.js').read;
const headerGen = require('./header.js').gen;

module.exports = { create };
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

	return { fd, ...header };
}
