module.exports.open = jest.fn(() => ({
	fd: 1,
	header: {dataStart: 42, tsLen: 6, itemLen: 8},
	stat: {size: 128}
}));
module.exports.create = jest.fn();
