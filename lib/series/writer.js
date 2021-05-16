const assert = require('assert');

const writerFactory = (openSeries, getTimestamp) => async ({dbName, seriesName}) => {
	const series = await openSeries({dir: dbName, name: seriesName, access: 'rw'});

	// Setup house keeping
	let ptr = series.getSize() - 1;
	let lastTimestamp;
	if (ptr >= 0) {
		// Get last timestamp to get minimum timestamp
		const lastRecord = await series.read(ptr);
		lastTimestamp = lastRecord.timestamp;
	} else {
		// First valid timestamp is 0
		lastTimestamp = 0;
	}

	async function write (record) {
		// Defaults
		if (typeof record !== 'object') record = {value: record};
		if (record.timestamp === undefined) record.timestamp = getTimestamp();

		assert(record.timestamp >= lastTimestamp, `Timestamp must be at least ${lastTimestamp}`);
		await series.write(record);
		lastTimestamp = record.timestamp;
	}

	async function close () {
		await series.close();
	}

	return {write, close};
};

module.exports = {writerFactory};
