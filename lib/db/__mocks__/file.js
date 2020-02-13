const File = jest.fn();
File.prototype.size = 0;
File.prototype.openRead = jest.fn(function () {
	this.access = 'ro';
});
File.prototype.openReadWrite = jest.fn(function () {
	this.access = 'rw';
});
File.prototype.read = jest.fn();
File.prototype.cachedRead = jest.fn();
File.prototype.write = jest.fn(function ({data}) {
	this.lastWrite = data;
	return {offset: 1234, size: data.length};
});
File.prototype.close = jest.fn();

module.exports = {File};
