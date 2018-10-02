const openDB = require('./db.js').open;
const getMetaByType = require('./meta.js').get;
const createMultiplexer = require('./multiplexer.js').create;

module.exports = {openDB, getMetaByType, createMultiplexer};
