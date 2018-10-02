const openDB = require('./db.js').open;
const getMetaByType = require('./meta.js').get;

module.exports = {openDB, getMetaByType};
