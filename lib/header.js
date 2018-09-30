const MAGIC = Buffer.from('TSF1');

module.exports = { read };

function read (header) {
	// Assert length
	if (header.length < 20) throw new Error('Header is too short');

	// Assert magic
	const magic = header.slice(0, 4);
	if (Buffer.compare(magic, MAGIC) !== 0) throw new Error(`Header Magic not found: 0x${magic.toString('hex')} != 0x${MAGIC.toString('hex')}`);

	// Read address offsets
	const metaStart = header.readUInt32LE(4);
	const metaEnd = header.readUInt32LE(8);
	const dataStart = header.readUInt32LE(12);
	const tsLen = header.readUInt16LE(16);
	const itemLen = header.readUInt16LE(18);

	return {metaStart, metaEnd, dataStart, tsLen, itemLen};
}
