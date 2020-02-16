const BlockAppender = jest.fn(function () {
	this.write = jest.fn((d) => ({offset: 1234, size: d.length}));
});

module.exports = {BlockAppender};
