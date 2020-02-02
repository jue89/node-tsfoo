const {File} = require('./file.js');
const {BlockReader} = require('./blockReader.js');
const {BlockAppender} = require('./blockAppender.js');

const openFactory = ({
	idxPack,
	idxUnpack,
	idxBlockSize,
	idxMagic,
	datPack,
	datUnpack
}) => async ({dir, filePostfix, access}) => {

};

module.exports = {openFactory};
