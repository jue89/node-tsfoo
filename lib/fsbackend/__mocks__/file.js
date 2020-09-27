const assert = require('assert');
const File = jest.fn(function ({path}) {
	const [expectedPath, content] = filesystem();
	assert(expectedPath === path);
	this.content = content;

	this.openRead = jest.fn(() => {
		assert(this.content, 'not existing');
		assert(!this.access, 'already open');
		this.size = this.content.length;
		this.access = 'ro';
	});
	this.openReadWrite = jest.fn(({create} = {}) => {
		assert(create || this.content, 'not existing');
		assert(!this.access, 'already open');
		if (!this.content) this.content = Buffer.alloc(0);
		this.size = this.content.length;
		this.access = 'rw';
	});
	this.read = jest.fn(({offset, size}) => {
		assert(this.access === 'ro' || this.access === 'rw');
		return this.content.slice(offset, offset + size);
	});
	this.cachedRead = jest.fn((args) => this.read(args));
	this.write = jest.fn(({offset, data}) => {
		assert(this.access === 'rw');
		// Make sure the buffer representing the content is large enough
		const diff = this.content.length - offset - data.length;
		if (diff < 0) {
			this.content = Buffer.concat([
				this.content,
				Buffer.alloc(diff * (-1))
			]);
		}
		data.copy(this.content, offset);
		this.size = this.content.length;
		return {offset, size: data.length};
	});
	this.close = jest.fn(() => {
		delete this.access;
	});
});

const filesystem = jest.fn(() => []);

module.exports = {File, filesystem};
