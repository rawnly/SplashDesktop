'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

const {shell, dialog, BrowserWindow, app, ipcMain, Menu} = require('electron');
const is = require('electron-is');
const {moveToApplications} = require('electron-lets-move');
const openAboutWindow = require('about-window').default;
const execa = require('execa');
const cmdExists = require('command-exists');
const settings = require('electron-settings');
const notify = require('electron-main-notification');
const frun = require('first-run');
const mkdirp = require('mkdirp');

const splash = require('./libs/splash');
const splashID = require('./libs/splash-id');
const idParser = require('./libs/id-parser');

const ipc = ipcMain;
const join = path.join;
const dock = app.dock;

let user = '';
let bouncer = '';
let forceQuit = false;

let indexWindow = "";
let splashScreen = "";

const template = [
	{
		label: app.getName(),
		submenu: [
			{
				label: 'About ' + app.getName(),
				click: () => openAboutWindow({
            icon_path: join(__dirname, 'assets', 'icon.png'),
            copyright: 'Copyright (c) 2015 Federico Vitale',
						package_json_dir: __dirname,
						homepage: 'https://rawnly.com'
        })
			}, {
				label: 'Preferences',
				accelerator: 'cmdOrCtrl+,',
				submenu: [
					{
						label: 'Set default path',
						click: () => {
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
								console.log(e[0]);
								if (e != undefined) {
									settings.set('path', e[0]);
									mkdirp.sync(e[0]);
									notify('New download path', {body: settings.get('path')});
								}
							});
						}
					}, {type: 'separator'},
					{
						label: cmdExists.sync('npm') ? 'Install Shell Commands' : 'Install Shell Commands (Node REQUIRED)',
						enabled: cmdExists.sync('npm') ? (cmdExists.sync('splash') ? false : true) : false,
						click: e => {
							execa('yarn', ['--version']).then(() => {
								execa('yarn', ['global', 'add', 'splash-cli']).then(() => {
									notify('Splash Desktop', {body: 'Splash Cli has been installed!'});
									e.enabled = false;
								}).catch(() => {
									execa('npm', ['--version']).then(() => {
										execa('npm', ['i', '-g', 'splash-cli']).then(() => {
											notify('Splash Desktop', {body: 'Splash Cli has been installed!'});
											e.enabled = false;
										});
									});
								});
							}).catch(() => {
								execa('npm', ['--version']).then(() => {
									execa('npm', ['i', '-g', 'splash-cli']).then(() => {
										notify('Splash Desktop', {body: 'Splash Cli has been installed!'});
										e.enabled = false;
									});
								});
							});
						}
					}, {
						label: 'Uninstall Helper',
						enabled: Boolean(cmdExists.sync('splash')),
						click: e => {
							execa('yarn', ['--version']).then(() => {
								execa('yarn', ['global', 'remove', 'splash-cli']).then(() => {
									notify('Splash Desktop', {body: 'Splash Cli has been removed...'});
									e.enabled = false;
								}).catch(() => {
									execa('npm', ['--version']).then(() => {
										execa('npm', ['remove', '-g', 'splash-cli']).then(() => {
											notify('Splash Desktop', {body: 'Splash Cli has been removed...'});
											e.enabled = false;
										});
									});
								});
							}).catch(() => {
								execa('npm', ['--version']).then(() => {
									execa('npm', ['remove', '-g', 'splash-cli']).then(() => {
										notify('Splash Desktop', {body: 'Splash Cli has been removed...'});
										e.enabled = false;
									});
								});
							});
						}
					}
				]
			}, {type: 'separator'}, {
				label: 'Quit',
				role: 'quit',
				accelerator: 'cmdOrCtrl+q'
			}
		]
	}, {
		label: 'Edit',
		submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {role: 'cut'},
      {role: 'copy'},
      {role: 'paste'},
      {role: 'pasteandmatchstyle'},
      {role: 'delete'},
      {role: 'selectall'}
		]
	},
	{
		label: 'View',
		submenu: [
      {role: 'reload'},
      {role: 'forcereload'},
      {type: 'separator'},
      {role: 'resetzoom'},
      {role: 'zoomin'},
      {role: 'zoomout'}
		]
	},
	{
		role: 'window',
		submenu: [
      {role: 'minimize'},
      {role: 'close'}
		]
	}, {
		label: 'Help',
		role: 'help',
		submenu: [
			{
				label: 'Found a bug?',
				click: () => {
					require('electron').shell.openExternal('https://github.com/rawnly/splashdesktop/issues')
				}
			}, {
				label: 'Got an idea?',
				click: () => {
					require('electron').shell.openExternal('https://github.com/rawnly/splashdesktop/pulls')
				}
			}, {type: 'separator'}, {
				label: 'Learn More',
				click: () => {
					require('electron').shell.openExternal('https://github.com/rawnly/splashdesktop')
				}
			}, {type: 'separator'},
			{
				label: 'About the author',
				submenu: [
					{
						label: 'Twitter',
						click: () => {
							require('electron').shell.openExternal('https://twitter.com/RawnlyDev')
						}
					}, {
						label: 'Github',
						click: () => {
							require('electron').shell.openExternal('https://github.com/rawnly')
						}
					}, {
						label: 'Website',
						click: () => {
							require('electron').shell.openExternal('https://rawnly.com')
						}
					}
				]
			}
		]
	}
];

app.on('ready', e => {
	if (settings.get('moved') == false || settings.get('moved') == undefined) {
		moveToApplications(function(err, moved) {
			if (err) {
				console.log(err);
			}

			if (!moved) {
				settings.set('moved', true)
			}
		});
	}

	if ( frun() ) {
		mkdirp.sync(parsePath('~/Pictures/splash_photos'));
		settings.set('path', parsePath('~/Pictures/splash_photos'))
		user = os.homedir().split('/')[2];
	}

	indexWindow = new BrowserWindow({
		width: 800,
		height: 800,
		frame: true,
		titleBarStyle: 'hidden-inset',
		resizable: false,
		fullscreenable: false,
		show: false
	});
	indexWindow.loadURL(`file://${join(__dirname, 'app', 'index.html')}`);

	splashScreen = new BrowserWindow({
		width: 450,
		height: 200,
		frame: false,
		resizable: false
	})
	splashScreen.loadURL(`file://${join(__dirname, 'app', 'splash.html')}`);

	setTimeout(function () {
		splashScreen.hide();
		indexWindow.show()
	}, 1000);

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	ipc.on('download', (e, text) => {
		if (text == 'random') {
			splash(settings.get('path'));
		} else {
			splashID(idParser(text), settings.get('path'));
		}
	});
});


// app.on('browser-window-blur', () => {
// 	console.log('BLURR');
// 	indexWindow.loadURL(`file://${join(__dirname, 'app', 'splash.html')}`);
// })
//
// app.on('browser-window-focus', () => {
// 	console.log('FOCUSED');
// 	indexWindow.loadURL(`file://${join(__dirname, 'app', 'index.html')}`);
// })

app.on('window-all-closed', e => {
	if (!forceQuit && is.macOS()) {
		e.preventDefault();
	}
});

function startBounce(interval = 1500) {
	const c = 1;
	return setInterval(() => {
		// App.dock.setBadge(`${c++}`);
		app.dock.bounce();
		console.log('BOING');
	}, (interval < 1500) ? 1500 : interval);
}

// Test function
function mapMenu(menu) {
	for (i in menu.items) {
		if (menu.items[i].label) {
			if (menu.items[i].submenu) {
				console.log(menu.items[i].label);

				menu.items[i].submenu.items.forEach(menuItem => {
					console.log('- ' + menuItem.label);
				});
			} else {
				console.log(menu.items[i].label);
			}
      // Console.log( menu.items[i].label );
		} else if (menu.items[i].type == 'separator') {
			console.log('----');
		}
	}
}

// My best work
function getMenuItem(label, menu) {
	for (i in menu.items) {
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
		var menuItem = menu.items.find(item => {
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
