const writerFactory = (openSeries, getTimestamp) => async ({dbName, seriesName}) => {
	const series = await openSeries({dbName, seriesName, access: 'rw'});

	// Setup house keeping
	let ptr = series.getSize() - 1;
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

module.exports = {writerFactory};