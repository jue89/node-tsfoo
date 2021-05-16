const {EventEmitter} = require('events');
const fs = require('fs');
const util = require('util');
const qsem = require('qsem');

const readdir = util.promisify(fs.readdir);

class Dir extends EventEmitter {
	constructor (path) {
		super();
		this._files = new Set();
		this._sem = qsem(1);

		const updateFiles = () => this._sem.limit(async () => {
			const files = new Set(await readdir(path));
			const added = [...files].filter((f) => !this._files.has(f));
			const removed = [...this._files].filter((f) => !files.has(f));
			added.forEach((f) => this._files.add(f));
			removed.forEach((f) => this._files.delete(f));
			added.forEach((f) => this.emit('change', 'add', f));
			removed.forEach((f) => this.emit('change', 'remove', f));
		});

		this._watcher = fs.watch(path, (eventType) => {
			if (eventType !== 'rename') return;
			updateFiles();
		});

		updateFiles();
	}

	get files () {
		return [...this._files];
	}

	async close () {
		await this._sem.enter();
		await new Promise((resolve) => {
			this._watcher.once('close', resolve);
			this._watcher.close();
		});
	}
}

module.exports = {Dir};
