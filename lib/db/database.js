const {EventEmitter} = require('events');
const {createReader, createWriter} = require('../series/index.js');
const {createReadStream, createWriteStream} = require('../stream/index.js');
const {Multiplexer} = require('./multiplexer.js');
const {Demultiplexer} = require('./demultiplexer.js');
const {Dir} = require('./watch.js');

class Database extends EventEmitter {
	constructor (dbName) {
		super();
		this.dbName = dbName;
		this._dir = new Dir(dbName);
		this._series = {};
		this._dir.on('change', (type, name) => {
			const fileType = name.substr(0, 4);
			const series = name.substr(4);
			if (!series) return;
			if (!this._series[series]) this._series[series] = 0;
			const oldState = this._series[series];
			let flag = 0;
			if (fileType === 'idx-') {
				flag = 1;
			} else if (fileType === 'dat-') {
				flag = 2;
			}
			if (type === 'remove') flag *= -1;
			this._series[series] += flag;
			if (oldState < 3 && this._series[series] === 3) {
				this.emit('discover', series);
			}
		});
	}

	get series () {
		return Object.entries(this._series)
			.filter(([key, value]) => value === 3)
			.map(([key, value]) => key);
	}

	async createWriter (seriesName) {
		if (typeof seriesName !== 'string') {
			return new Multiplexer((seriesName) => this.createWriter(seriesName));
		} else {
			return createWriter({
				dbName: this.dbName,
				seriesName: seriesName
			});
		}
	}

	async createWriteStream (seriesName) {
		return createWriteStream(await this.createWriter(seriesName));
	}

	async createReader (seriesName, opts = {}) {
		if (Array.isArray(seriesName)) {
			const readers = await Promise.all(seriesName.map((seriesName) => {
				let localOpts = {};
				if (Array.isArray(seriesName)) {
					localOpts = seriesName[1] || {};
					seriesName = seriesName[0];
				}
				return createReader({
					...opts,
					...localOpts,
					dbName: this.dbName,
					seriesName: seriesName
				});
			}));
			return new Demultiplexer(readers);
		} else {
			return createReader({
				...opts,
				dbName: this.dbName,
				seriesName: seriesName
			});
		}
	}

	async createReadStream (seriesName, opts) {
		return createReadStream(await this.createReader(seriesName, opts));
	}

	async close () {
		await this._dir.close();
		// TODO: Close all reader and writer
	}
}

module.exports = {Database};
