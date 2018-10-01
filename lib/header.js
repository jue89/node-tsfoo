const MAGIC = Buffer.from('TSF1');
const TSBEN = 6;

module.exports = { read, gen };

function read (header) {
	// Assert length
	if (header.length < 20) throw new Error('Header is too short');
	const data = header.slice(0, 20);

	// Assert magic
	const magic = data.slice(0, 4);
	if (Buffer.compare(magic, MAGIC) !== 0) throw new Error(`Header Magic not found: 0x${magic.toString('hex')} != 0x${MAGIC.toString('hex')}`);

	// Read address offsets
	const metaStart = data.readUInt32BE(4);
	const metaEnd = data.readUInt32BE(8);
	const dataStart = data.readUInt32BE(12);
	const tsLen = data.readUInt8(17);
	const itemLen = data.readUInt16BE(18);

	return {metaStart, metaEnd, dataStart, tsLen, itemLen, data};
}

function gen (info = {}) {
	if (typeof info.itemLen !== 'number') throw new Error('itemLen must be set');
	if (typeof info.metaCode !== 'string') throw new Error('metaCode must be set');

	// Craft offset and length fields
	const offsets = Buffer.alloc(4 * 4);
	const metaStart = MAGIC.length + offsets.length;
	offsets.writeUInt32BE(metaStart, 0);
	const metaEnd = metaStart + Buffer.byteLength(info.metaCode);
	offsets.writeUInt32BE(metaEnd, 4);
	const dataStart = metaEnd;
	offsets.writeUInt32BE(dataStart, 8);
	const tsLen = TSBEN;
	offsets.writeUInt8(tsLen, 13);
	const itemLen = info.itemLen;
	offsets.writeUInt16BE(itemLen, 14);

	const data = Buffer.concat([MAGIC, offsets]);

	return {metaStart, metaEnd, dataStart, tsLen, itemLen, data};
}
