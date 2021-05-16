jest.mock('fs');
const mockFs = require('fs');

const {Dir} = require('../watch.js');

const nextLoop = () => new Promise((resolve) => setImmediate(resolve));

test('read dir on start', async () => {
	const dir = '/tmp';
	const dirContent = ['a', 'b', 'c'];
	mockFs._readdir.mockReturnValueOnce(dirContent);
	const d = new Dir(dir);
	const onAdd = jest.fn();
	const onRemove = jest.fn();
	d.on('change', (type, file) => {
		if (type === 'add') onAdd(file);
		else if (type === 'remove') onRemove(file);
	});
	expect(mockFs.watch.mock.calls[0][0]).toBe(dir);
	await nextLoop();
	expect(d.files).toMatchObject(dirContent);
	expect(onRemove.mock.calls.length).toBe(0);
	expect(onAdd.mock.calls).toMatchObject(dirContent.map((f) => [f]));
});

test('react on changes', async () => {
	const d = new Dir();
	await nextLoop();
	const trigger = async (ev = 'rename') => {
		mockFs.watch.mock.calls[0][1](ev);
		await nextLoop();
	}
	const onAdd = jest.fn();
	const onRemove = jest.fn();
	d.on('change', (type, file) => {
		if (type === 'add') onAdd(file);
		else if (type === 'remove') onRemove(file);
	});
	mockFs._readdir.mockReturnValueOnce(['a']);
	await trigger('change');
	expect(onAdd.mock.calls.length).toBe(0);
	await trigger();
	expect(onAdd.mock.calls[0][0]).toEqual('a');
	mockFs._readdir.mockReturnValueOnce(['a', 'b']);
	await trigger();
	expect(onAdd.mock.calls[1][0]).toEqual('b');
	mockFs._readdir.mockReturnValueOnce([]);
	await trigger();
	expect(onRemove.mock.calls[0][0]).toEqual('a');
	expect(onRemove.mock.calls[1][0]).toEqual('b');
});

test('remove file watch', async () => {
	const d = new Dir();
	const watcher = mockFs.watch.mock.results[0].value;
	await d.close();
	expect(watcher.close.mock.calls.length).toBe(1);
});
