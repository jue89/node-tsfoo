const type = 'number';
const itemLen = 8;

function pack (v) {
	const b = Buffer.allocUnsafe(itemLen);
	b.writeDoubleLE(v);
	return b;
}

function unpack (b) {
	return b.readDoubleLE(0);
}

module.exports = {type, itemLen, pack, unpack};
