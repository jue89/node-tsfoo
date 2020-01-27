const seriesWriteFactory = (openSeries, getTimestamp) => async ({dbName, seriesName}) => {
	const series = await openSeries({dbName, seriesName, access: 'rw'});

	// Setup house keeping
	let ptr = series.size - 1;
	let lastTimestamp;
	if (ptr >= 0) {
		// Get last timestamp to get minimum timestamp
		const lastRecord = await series.read(ptr);
		lastTimestamp = lastRecord.timestamp;
	} else {
		// First valid timestamp is 0
		lastTimestamp = -1;
	}

	async function write (record) {
		// Defaults
		if (typeof record !== 'object' || !record || record.value === undefined) record = {value: record};
		if (record.timestamp === undefined) record.timestamp = getTimestamp();

		if (record.timestamp <= lastTimestamp) throw new Error(`Timestamp must be at least ${lastTimestamp + 1}`);
		await series.write(record);
		lastTimestamp = record.timestamp;
	}

	async function close () {
		await series.close();
	}

	return {write, close};
};

const seriesReadFactory = (openSeries) => async ({db, seriesName, from, to = Number.MAX_VALUE, follow = true}) => {
	/* const series = await openSeries({db, seriesName, access: 'ro'});

	// Setup house keeping
	let ptr = 0;
	if (from !== undefined) {
		ptr = await series.search(from);
	}
	const ptrMax = (follow) ? Number.MAX_VALUE : series.size - 1;

	async function read () {
		if (ptr > ptrMax) throw new Error('EOF');
		const record = await series.read(ptr);
		if (record.timestamp >= to) throw new Error('EOF');
		return record;
	}

	async function close () {
		await series.close();
	}

	return {read, close}; */
};

module.exports = {seriesWriteFactory, seriesReadFactory};
