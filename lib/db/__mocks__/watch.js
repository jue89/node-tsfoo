module.exports.Dir = jest.fn(function () {
	this.on = jest.fn(() => this);
	this.close = jest.fn();
});
