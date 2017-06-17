const got = require('got');
const compare = require('compare-versions');
const pkg = require('../package.json');

got('https://raw.githubusercontent.com/Rawnly/SplashDesktop/master/package.json').then(({body}) => {
	var latest = JSON.parse(body).version;
	var installed = pkg.version;

	if (latest != installed) {
		if (compare(latest, installed) >= 1) {
			return latest;
		}

		return false;
	}

	return false;
});
