# Timeseries Foo

Well, atm just another database to store time-series data. Proof-of-concept ... likely to eat your data ;)

## Concept

Some unordered thoughts:

 * Every database holds many series - each in one file. No forced semantics in series names - just names. If you would like to have semantic information inside the series name, just put it in the way you like it.
 * Every series has many records. Every record has a timestamp (ms accuracy) and has always the same length. The timestamps must be monotonically increasing but don't have to be equidistant. This decision should be beneficial to flexibility while ensuring seeking to a specific timestamp to be an inexpensive task.
 * Every series can have one user writing to it (enforced by exclusive file locks) and many users reading from it.
 * The series can be read from while writing to it. The only connection between the writing and the reading task is the file system itself.
 * Reading and writing utilises that readable resp. writeable stream of node js in object mode.
 * Every series must have a pack and an unpack function attached to it. Pack converts values to the disk format und unpack from the disk format back to the value. This way series can hold any datatype as long as it consumes always the same amount of space.


## Example

```js
const os = require('os');
const tsfoo = require('tsfoo');

// Everything is stored in a directory
tsfoo.openDB('db-dir').then(async (db) => {
	// Write current load into one series
	const writeLoadSeries = await db.createWriteStream('load', {
		// If the series hasn't created in the past, we must define some
		// meta code that helps packing and unpacking numbers.
		defaultMetaCode: await tsfoo.getMetaByType('number')
	});
	setInterval(() => writeLoadSeries.write({
		timestamp: Date.now(),
		value: os.loadavg()[0]
	}), 10000);

	// Read back written data
	const readLoadSeries = await db.createReadStream('load', {
		// Keep the file open and read newly written records
		follow: true
	});
	readLoadSeries.on('data', (record) => console.log(record.timestamp, record.value));
});
```
