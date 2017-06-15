const normalize = require('normalize-url');
const urlRegex = require('url-regex');

module.exports = string => {
	string = normalize(string);
	if (string.match(urlRegex())) {
		let id = '';
		if (string.includes('?photo=')) {
			id = string.split('?photo=')[1];
		} else {
			id = string.split('/photo/')[1];
		}

		return id.slice(0, 11);
	}
	return string;
};
