const readerFactory = (openSeries) => async ({dbName, seriesName, from, to = Number.MAX_VALUE, follow = true}) => {
	const series = await openSeries({dir: dbName, name: seriesName, access: 'ro'});

	// Setup house keeping
	let ptr = 0;
	if (from !== undefined) {
		ptr = await series.search(from + 1);
	}
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
