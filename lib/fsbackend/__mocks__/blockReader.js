const BlockReader = jest.fn(function () {
	this.readBlock = jest.fn();
	this.bisectSearch = jest.fn(() => 42);
});

module.exports = {BlockReader};
