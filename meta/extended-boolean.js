const type = 'extended-boolean';
const itemLen = 1;

                //  't'   'f'   'n'   'u'
const CONSTANTS = [0x74, 0x66, 0x6e, 0x75].reduce((c, v) => {
	c[v] = Buffer.alloc(1, v);
	return c;
}, {});

function pack (v) {
	if (v === undefined) return CONSTANTS[0x75];
	if (v === null) return CONSTANTS[0x6e];
	return v ? CONSTANTS[0x74] : CONSTANTS[0x66];
}

function unpack (b) {
	switch (b[0]) {
		case 0x66: return false;
		case 0x6e: return null;
		case 0x75: return undefined;
	}
	return true;
}

module.exports = {type, itemLen, pack, unpack};
