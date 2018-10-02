const path = require('path');

jest.mock('fs-ext');
const mockFs = require('fs-ext');

const getMetaByType = require('../getMetaByType.js');

const METADIR = path.resolve(__dirname, '../meta');

test('read meta file', async () => {
	const type = 'test';
	const fileContent = 'abcd';
	const file = Buffer.from(fileContent);
	mockFs.readFile.mockImplementationOnce((p, cb) => cb(null, file));
	const metaCode = await getMetaByType(type);
	expect(metaCode).toEqual(fileContent);
	expect(mockFs.readFile.mock.calls[0][0]).toEqual(path.join(METADIR, `${type}.js`));
});

test('return error if file cannot be read', async () => {
	const type = 'test';
	mockFs.access.mockImplementation((file, mode, cb) => cb(new Error()));
	try {
		await getMetaByType(type);
		throw new Error('Failed!');
	} catch (e) {
		expect(e.message).toEqual(`Cannot retrive meta code for type ${type}`);
		expect(mockFs.access.mock.calls[0][0]).toEqual(path.join(METADIR, `${type}.js`));
		expect(mockFs.access.mock.calls[0][1]).toEqual(mockFs.constants.R_OK);
	}
});
