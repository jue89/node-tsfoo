const BlockReader = jest.fn();
BlockReader.prototype.readBlock = jest.fn();
BlockReader.prototype.bisectSearch = jest.fn(() => 42);

module.exports = {BlockReader};
