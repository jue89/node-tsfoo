const MAGIC = Buffer.from('TSF1');
const TSLEN = 8;

module.exports = { read, gen };

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

function gen (info = {}) {
	if (typeof info.itemLen !== 'number') throw new Error('itemLen must be set');
	if (typeof info.meta !== 'string') throw new Error('meta must be set');

	// Craft offset and length fields
	const offsets = Buffer.alloc(4 * 4);
	const metaStart = MAGIC.length + offsets.length;
	offsets.writeUInt32LE(metaStart, 0);
	const metaEnd = metaStart + info.meta.length;
	offsets.writeUInt32LE(metaEnd, 4);
	const dataStart = metaEnd;
	offsets.writeUInt32LE(dataStart, 8);
	const tsLen = TSLEN;
	offsets.writeUInt16LE(tsLen, 12);
	const itemLen = info.itemLen;
	offsets.writeUInt16LE(itemLen, 14);

	return {
		metaStart,
		metaEnd,
		dataStart,
		tsLen,
		itemLen,
		data: Buffer.concat([MAGIC, offsets])
	};
}