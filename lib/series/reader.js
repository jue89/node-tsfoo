const assert = require('assert');
const readerFactory = (openSeries) => async ({dbName, seriesName, ptr = -1, from, to = Number.MAX_VALUE, follow = true}) => {
	const series = await openSeries({dir: dbName, name: seriesName, access: 'ro'});

	// Setup house keeping
	ptr = (from !== undefined) ? await series.search(from + 1) : ptr + 1;
	assert(ptr >= 0, 'ptr must be positive');
	const ptrMax = (follow) ? Number.MAX_VALUE : series.getSize() - 1;

	async function read ({blocking = true} = {}) {
		if (ptr > ptrMax) return null;
		const record = await series.read(ptr, {blocking});
		if (record.timestamp > to) return null;
		record.ptr = ptr;
		record.series = seriesName;
		ptr++;
		return record;
	}

	async function close () {
		await series.close();
	}

	return {read, close};
};

module.exports = {readerFactory};
