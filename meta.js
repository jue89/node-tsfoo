const path = require('path');
const fs = require('./wrapper/fs.js');

const METADIR = path.join(__dirname, 'meta');

async function get (type) {
	const file = path.join(METADIR, `${type}.js`);
	const access = await fs.access(file, fs.constants.R_OK);
	if (!access) throw new Error(`Cannot retrive meta code for type ${type}`);
	const metaCode = await fs.readFile(file);
	return metaCode.toString();
};

module.exports = {get, METADIR};
