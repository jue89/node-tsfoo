module.exports.gen = jest.fn(() => ({metaStart: 1, metaEnd: 2, dataStart: 3, tsLen: 8, itemLen: 0, data: Buffer.alloc(20)}));
module.exports.read = jest.fn(() => ({metaStart: 1, metaEnd: 2, dataStart: 3, tsLen: 8, itemLen: 0}));
