const type = 'boolean';
const itemLen = 1;

const TRUE = Buffer.alloc(1, 1);
const FALSE = Buffer.alloc(1, 0);

function pack (v) {
	return v ? TRUE : FALSE;
}

function unpack (b) {
	return b[0] !== FALSE[0];
}

module.exports = {type, itemLen, pack, unpack};
