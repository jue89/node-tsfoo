# Timeseries Foo

Well, just another database to store time-series data.

## Concept

Some unordered thoughts:

 * Every database holds many series. No forced semantics in series names - just names. If you would like to have semantic information inside the series name, just put it in the way you like it.
 * Every series has many records. Every record has a timestamp (ms accuracy) and a value. The timestamps must be monotonically increasing but don't have to be equidistant. This decision should be beneficial to flexibility while ensuring seeking to a specific timestamp to be an inexpensive task.
 * Every record is stored in two different files: an index file `idx-${seriesName}` and a data file `dat-${seriesName}`. The index holds the timestamp together with an offset and a size that points to the data file. The value is stored serialised using CBOR inside the data file.
 * Every series can have one user writing to it (enforced by exclusive file locks) and many users reading from it.
 * The series can be read from while writing to it. The only connection between the writing and the reading task is the file system itself.
 * Reading and writing utilises that readable resp. writeable stream of node js in object mode.

## API

```js
const {openDB} = require('tsfoo');
openDB(dbPath).then((db) => {...});
```
Opens a database stored at `dbPath`.

### Method: db.createWriter()

```js
db.createWriter([series]).then((writer) => {
	writer.write(record).then(() => {...});
	writer.close().then(() => {...})
})
```

Creates a Writer instance `writer`. `series` is the series name the `record` is written to. If `series` is omitted, a series must be stated within each `record`. `series.write(record)` writes to the database and returns a Promise which is resolved once the record has been written to disk. `record` is an object with the following items:

 * `value`: The value written to the database.
 * `timestamp`: The timestamp when `value` has been recorded. Default: `Date.now()`.
 * `series`: If no series has been stated during writer creation, this states the series, this record shall be written to.

`series.close()` closes the writer. Its returned Promise is resolved if the series has been closed.

### Method: db.createWriteStream()

```js
db.createWriteStream([series]).then((writer) => {})
```

Returns an instance of [`stream.Writable`](https://nodejs.org/docs/latest-v14.x/api/stream.html#stream_class_stream_writable) in object mode. `series` is the series streamed records are written to. If `series` is omitted, a series must be stated within `record`.

### Method: db.createReader()

```js
db.createReader(series[, opts]).then((reader) => {
	reader.read([ropts]).then((record) => {...});
	reader.close().then(() => {...})
})
```

Creates a Reader instance `reader` reading from `series`. `opts` can have the following properties:

 * `from`: A timestamp in ms. Start reading records after the given timestamp (i.e. excluding the record with the given timestamp).
 * `to`: A timestamp in ms. Start reading records until the given timestamp (i.e. including the record with the given timestamp.
 * `follow`: Boolean. If set to `false` the reader stops reading if it reached the end of the series. Default: `true`.

`reader.read()` returns a Promise which is resolved with:
 * `null` if the EOF is reached and `follow` is set to `false` or if the last record matching the `to` constraint has been streamed
 * or an Object containing the next record with the items `timestamp`, `series`, `value`.

`ropts` is an object with the following properties:

 * `blocking`: Boolean. If set to `false`, `read()` will reject with an Error if the EOF of the series has been reached. Default: `true`.

`reader.close()` closes the reader. Its returned promise is resolved if the series has been closed.

### Method: db.createReadStream()

```js
db.createReadStream(series[, opts]).then((reader) => {})
```

Returns an instance of [`stream.Readable`](https://nodejs.org/docs/latest-v14.x/api/stream.html#stream_class_stream_readable) in object mode. `series` is the series wich sources the read stream.


## Example

```js
const os = require('os');
const tsfoo = require('tsfoo');

// Everything is stored in a directory
tsfoo.openDB('db-dir').then(async (db) => {
	// Write current load into one series
	const writeLoadSeries = await db.createWriteStream('load');
	setInterval(() => writeLoadSeries.write({
		timestamp: Date.now(),
		value: os.loadavg()[0]
	}), 10000);

	// Read back written data
	const readLoadSeries = await db.createReadStream('load');
	readLoadSeries.on('data', (record) => console.log(record.timestamp, record.value));
});
```
