const fs = require('fs');

module.exports = {open, write, read, fstat};

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
