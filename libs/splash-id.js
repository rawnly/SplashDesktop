const fs = require('fs');
const path = require('path');

const {app} = require('electron');
const got = require('got');
const download = require('simple-download');
const wallpaper = require('wallpaper');
const normalize = require('normalize-url');
const notify = require('electron-main-notification');

const dock = app.dock;
const join = path.join;
const jparse = JSON.parse;

module.exports = (id, d_path) => {
	const token = 'daf9025ad4da801e4ef66ab9d7ea7291a0091b16d69f94972d284c71d7188b34';
	const apiURL = normalize(`https://api.unsplash.com/photos/${id}?client_id=${token}`);

	const api = normalize(apiURL);
	got(api).then(response => {
		const body = response.body;
		const photo = jparse(body);

		download({
			url: photo.urls.full,
			file: photo.id + '.jpg',
			path: d_path
		}, (i, p) => {
			dock.bounce();
			notify('Download completed', {body: p});
			wallpaper.set(path.join(i));
		});
	});

	return true;
};
