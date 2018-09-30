module.exports.gen = jest.fn();
module.exports.read = jest.fn(() => ({metaStart: 1, metaEnd: 2, dataStart: 3, tsLen: 8, itemLen: 0}));
