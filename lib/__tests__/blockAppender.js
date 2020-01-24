const {BlockAppender} = require('../blockAppender.js');

describe('BlockAppender', () => {
	test('check minimum file size', () => {
		const offset = 4;
		const file = {size: offset - 1};
		expect(() => new BlockAppender({file, offset})).toThrow('File too short');
	});

	test('get size', () => {
		const offset = 4;
		const blockSize = 2;
		const file = {size: offset};
		const ba = new BlockAppender({file, offset, blockSize});
		expect(ba.size).toBe(0);
		file.size = offset + blockSize;
		expect(ba.size).toBe(1);
		file.size = offset + blockSize * 1.5;
		expect(ba.size).toBe(1);
		file.size = offset + blockSize * 2;
		expect(ba.size).toBe(2);
	});
});

describe('BlockAppender::write', () => {
	test('complain about wrongly sized buffers', async () => {
		const offset = 4;
		const blockSize = 2;
		const file = {size: offset};
		const ba = new BlockAppender({file, offset, blockSize});
		return expect(ba.write(Buffer.alloc(blockSize - 1))).rejects.toThrow('Buffer has wrong length');
	});

	test('append blocks', async () => {
		const offset = 4;
		const blockSize = 2;
		const write = jest.fn();
		const file = {size: offset + blockSize, write};
		const ba = new BlockAppender({file, offset, blockSize});
		const buf = Buffer.alloc(2);
		await ba.write(buf);
		expect(write.mock.calls[0][0].data).toBe(buf);
		expect(write.mock.calls[0][0].offset).toBe(offset + blockSize);
		await ba.write(buf);
		expect(write.mock.calls[1][0].offset).toBe(offset + 2 * blockSize);
	});

	test('ignore half-written blocks', async () => {
		const offset = 4;
		const blockSize = 2;
		const write = jest.fn();
		const file = {size: offset + 1.5 * blockSize, write};
		const ba = new BlockAppender({file, offset, blockSize});
		await ba.write(Buffer.alloc(2));
		expect(write.mock.calls[0][0].offset).toBe(offset + blockSize);
	});
});
