'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

const {shell, dialog, BrowserWindow, app, ipcMain, Menu} = require('electron');
const clear = require('clear');
const is = require('electron-is');
const {moveToApplications} = require('electron-lets-move');
const openAboutWindow = require('about-window').default;
const execa = require('execa');
const cmdExists = require('command-exists');
const settings = require('electron-settings');
const notify = require('electron-main-notification');
const frun = require('first-run');
const mkdirp = require('mkdirp');
const wallpaper = require('wallpaper');
const got = require('got');
const compare = require('compare-versions');

const splash = require('./libs/splash');
const splashID = require('./libs/splash-id');
const idParser = require('./libs/id-parser');
const pkg = require('./package.json');

const ipc = ipcMain;
const join = path.join;
const dock = app.dock;

let user = '';
let bouncer = '';
let forceQuit = false;
let forceForceQuit = false;

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
				click: () => redirecTo('settings')
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
      {role: 'selectall'},
			{role: 'toggledevtools'}
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
      {role: 'close'},
			{ type: 'separator' },
			{
				label: 'Gallery',
				accelerator: 'cmdOrCtrl+shift+g',
				click: () => redirecTo('gallery')
			}, {
				label: 'Home',
				accelerator: 'cmdOrCtrl+shift+h',
				click: () => redirecTo('index')
			}
			// {role: 'toggledevtools'}
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
		settings.clearPath();
		mkdirp.sync(parsePath('~/Pictures/splash_photos'));
		settings.set('path', parsePath('~/Pictures/splash_photos'))
		settings.set('askBeforeQuit', true);
		user = os.homedir().split('/')[2];
	}

	app.dock.setMenu(Menu.buildFromTemplate([
		{
			label: 'Clear First Run',
			click: () => frun.clear()
		}
	]))

	console.log('ASK BEFORE QUIT: ' + settings.get('askBeforeQuit'));

	indexWindow = new BrowserWindow({
		width: 800,
		height: 800,
		frame: true,
		titleBarStyle: 'hiddenInset',
		resizable: false,
		fullscreenable: false,
		show: false,
		vibrancy: 'light',
		title: 'Splash Desktop',
		maximizable: false
	});
	indexWindow.loadURL(`file://${join(__dirname, 'app', 'index.html')}`);

	splashScreen = new BrowserWindow({
		width: 450,
		height: 200,
		frame: false,
		resizable: false,
		vibrancy: 'light',
		title: 'splashscreen',
		maximizable: false,
		minimizable: false
	})
	splashScreen.loadURL(`file://${join(__dirname, 'app', 'splash.html')}`);

	indexWindow.on('ready-to-show', () => {
		splashScreen.hide();
		indexWindow.show();
		indexWindow.focus();
		checkUpdate();
	})

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	if (process.platform === 'darwin') {
	  app.on('before-quit', function() {
	    forceQuit = true;
	  });
	  indexWindow.on('close', function(event) {
	    if (!forceQuit) {
	      event.preventDefault();
				indexWindow.hide();
	    }
	  });
		app.on('activate', (e) => {
			indexWindow.show();
			clear();
			console.log(e);
		})
	}



	ipc.on('download', (e, text) => {
		if (text == 'random') {
			splash(settings.get('path'));
		} else {
			splashID(idParser(text), settings.get('path'));
		}
	});
	ipc.on('setPath', (e) => setDownloadPath());
	ipc.on('showPic', (e, p) => {
		shell.showItemInFolder(p);
	})
	ipc.on('setPic', (e, p) => {
		wallpaper.set(p);
	})
	ipc.on('openPic', (e, p) => {
		shell.openItem(p);
	})

	ipc.on('askBeforeQuit', (e, ask) => {
		settings.set('askBeforeQuit', ask)
		console.log(ask);
	})

	ipc.on('restoreDefaults', (e) => {
		dialog.showMessageBox({
			type: 'question',
			title: 'Settings',
			detail: 'Splash Dekstop needs to be restarted to restore defaults.',
			message: 'Restoring Defaults',
			buttons: [
				'Next time',
				'Relaunch',
				'Abort'
			]
		}, (e) => {
			if (e == 1) {
				forceForceQuit = true;
				frun.clear();
				app.quit();
				app.relaunch();
			} else if (e == 0) {
				frun.clear();
				console.log('NEXT TIME');
			}
		})
	})
});

app.on('window-all-closed', e => {
	if (!forceQuit && is.macOS()) {
		e.preventDefault();
	}
});

app.on('will-quit', (event) => {
	if (settings.get('askBeforeQuit') == true && forceForceQuit == false) {
		event.preventDefault();
		dialog.showMessageBox({
			title: 'You are quitting..',
			message: 'Are you sure?',
			buttons: ['Yes', 'Nope']
		}, (e) => {
			if (e == 0) {
				forceForceQuit = true;
				app.quit();
			} else {
				indexWindow = new BrowserWindow({
					width: 800,
					height: 800,
					frame: true,
					titleBarStyle: 'hiddenInset',
					resizable: false,
					fullscreenable: false,
					show: true,
					vibrancy: 'light',
					title: 'Splash Desktop',
					maximizable: false
				});
				indexWindow.loadURL(`file://${join(__dirname, 'app', 'index.html')}`);
			}
		});
	}
})




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
					message: `New Version available!`,
					detail: `A new version of SplashDesktop is available! Download now!`,
					buttons: [
						"Download",
						"Later"
					]
				}, (e) => {
					if (e == 0) {
						shell.openExternal('https://github.com/rawnly/splashdesktop')
					}
				})
			}
		}
	})
}

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

function redirecTo(pagename) {
	var focus = BrowserWindow.getFocusedWindow();
	focus.loadURL('file://' + join(__dirname, 'app', pagename + '.html'))

	return 'file://' + join(__dirname, 'app', pagename + '.html');
}
