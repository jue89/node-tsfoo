const fs = require('fs-ext');

module.exports = {...fs, open, write, read, fstat, flock, close};

function open (path, mode) {
	return new Promise((resolve, reject) => fs.open(path, mode, (err, fd) => {
		if (err) reject(err);
		else resolve(fd);
	}));
}

function write (fd, data, pos = 0) {
	return new Promise((resolve, reject) => fs.write(fd, data, 0, data.length, pos, (err) => {
		if (err) reject(err);
		else resolve();
	}));
}

function read (fd, buffer, pos = 0) {
	return new Promise((resolve, reject) => fs.read(fd, buffer, 0, buffer.length, pos, (err) => {
		if (err) reject(err);
		else resolve();
	}));
}

function fstat (fd) {
	return new Promise((resolve, reject) => fs.fstat(fd, (err, stat) => {
		if (err) reject(err);
		else resolve(stat);
	}));
}

function flock (path, mode) {
	return new Promise((resolve, reject) => fs.flock(path, mode, (err) => {
		if (err) reject(err);
		else resolve();
	}));
}

function close (fd) {
	return new Promise((resolve, reject) => fs.close(fd, (err) => {
		if (err) reject(err);
		else resolve();
	}));
}
