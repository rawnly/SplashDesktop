const path = require('path');
const os = require('os');

const got = require('got');
const {BrowserWindow, app, dialog, shell} = require('electron');
const settings = require('electron-settings');
const notify = require('electron-main-notification');
const mkdirp = require('mkdirp');
const compare = require('compare-versions');

const join = path.join;
const pkg = require('../package.json');

module.exports = {
	setDownloadPath: setDownloadPath,
	checkUpdate: checkUpdate,
	startBounce: startBounce,
	parsePath: parsePath,
	// mapMenu: mapMenu,
	getMenuItem: getMenuItem
};

function setDownloadPath() {
	dialog.showOpenDialog({
		title: 'Select default save path',
		defaultPath: settings.get('path'),
		buttonLabel: 'Set as splash folder',
		properties: [
			'openDirectory',
			'openFile',
			'createDirectory'
		]
	}, e => {
		if (e != undefined) {
			settings.set('path', e[0]);
			mkdirp.sync(e[0]);
			notify('New download path', {body: settings.get('path')});
		}
	});
}

function checkUpdate() {
	got('https://raw.githubusercontent.com/Rawnly/SplashDesktop/master/package.json').then(({body}) => {
		var latest = JSON.parse(body).version;
		var installed = pkg.version;

		if (latest != installed) {
			if (compare(latest, installed) == 1) {
				dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
					title: `Update Available! ${latest}`,
					message: 'New Version available!',
					detail: 'A new version of SplashDesktop is available! Download now!',
					buttons: [
						'Download',
						'Later'
					]
				}, (e) => {
					if (e == 0) {
						shell.openExternal('https://github.com/rawnly/splashdesktop');
					}
				});
			}
		}
	});
}

function startBounce(interval = 1500) {
	return setInterval(() => {
		// App.dock.setBadge(`${c++}`);
		app.dock.bounce();
	}, (interval < 1500) ? 1500 : interval);
}

// Test function
// function mapMenu(menu) {
// 	for (let i in menu.items) {
// 		if (menu.items[i].label) {
// 			if (menu.items[i].submenu) {
// 				console.log(menu.items[i].label);
//
// 				menu.items[i].submenu.items.forEach(menuItem => {
// 					console.log('- ' + menuItem.label);
// 				});
// 			} else {
// 				console.log(menu.items[i].label);
// 			}
//       // Console.log( menu.items[i].label );
// 		} else if (menu.items[i].type == 'separator') {
// 			console.log('----');
// 		}
// 	}
// }

// My best work
function getMenuItem(label, menu) {
	for (let i in menu.items) {
		if (menu.items[i].submenu.items) {
			const subItem = menu.items[i].submenu.items.find(item => {
				return item.label === label;
			});

			if (subItem) {
				return subItem;
			}
			var menuItem = menu.items.find(item => {
				return item.label.toString().toLowerCase() === label.toString().toLowerCase();
			});

			if (menuItem) {
				return menuItem;
			}
			return false;
		}
		menuItem = menu.items.find(item => {
			return item.label.toString().toLowerCase() === label.toString().toLowerCase();
		});

		if (menuItem) {
			return menuItem;
		}
		return false;
	}
}

function parsePath(string) {
	if (string.includes('~')) {
		return join(os.homedir(), string.split('~').join('/'));
	}

	return string;
}
