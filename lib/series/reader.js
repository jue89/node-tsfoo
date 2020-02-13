const readerFactory = (openSeries) => async ({dbName, seriesName, from, to = Number.MAX_VALUE, follow = true}) => {
	const series = await openSeries({dir: dbName, name: seriesName, access: 'ro'});

	// Setup house keeping
	let ptr = 0;
	if (from !== undefined) {
		ptr = await series.search(from);
	}
	const ptrMax = (follow) ? Number.MAX_VALUE : series.getSize() - 1;

	async function read () {
		if (ptr > ptrMax) throw new Error('EOF');
		const record = await series.read(ptr);
		if (record.timestamp >= to) throw new Error('EOF');
		ptr++;
		return record;
	}

	async function close () {
		await series.close();
	}

	return {read, close};
};

module.exports = {readerFactory};
