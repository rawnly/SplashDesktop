'use strict';

const path = require('path');
const os = require('os');

const {shell, dialog, BrowserWindow, app, ipcMain, Menu} = require('electron');
// const clear = require('clear');
const is = require('electron-is');
const {moveToApplications} = require('electron-lets-move');
const openAboutWindow = require('about-window').default;
const settings = require('electron-settings');
const frun = require('first-run');
const mkdirp = require('mkdirp');
const wallpaper = require('wallpaper');
const notify = require('electron-main-notification');

const splash = require('./libs/splash');
const splashID = require('./libs/splash-id');
const idParser = require('./libs/id-parser');
const h = require('./libs/helpers');

const ipc = ipcMain;
const join = path.join;

let forceQuit = false;
let forceForceQuit = false;

let indexWindow = '';
let splashScreen = '';

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
					require('electron').shell.openExternal('https://github.com/rawnly/splashdesktop/issues');
				}
			}, {
				label: 'Got an idea?',
				click: () => {
					require('electron').shell.openExternal('https://github.com/rawnly/splashdesktop/pulls');
				}
			}, {type: 'separator'}, {
				label: 'Learn More',
				click: () => {
					require('electron').shell.openExternal('https://github.com/rawnly/splashdesktop');
				}
			}, {type: 'separator'},
			{
				label: 'About the author',
				submenu: [
					{
						label: 'Twitter',
						click: () => {
							require('electron').shell.openExternal('https://twitter.com/RawnlyDev');
						}
					}, {
						label: 'Github',
						click: () => {
							require('electron').shell.openExternal('https://github.com/rawnly');
						}
					}, {
						label: 'Website',
						click: () => {
							require('electron').shell.openExternal('https://rawnly.com');
						}
					}
				]
			}
		]
	}
];

app.on('ready', () => {
	if (settings.get('moved') == false || settings.get('moved') == undefined) {
		moveToApplications(function(err, moved) {
			if (err) {
				dialog.newMessageBox({
					type: 'error',
					message: err
				});
			}

			if (!moved) {
				settings.set('moved', true);
			}
		});
	}

	if ( frun() ) {
		settings.clearPath();
		mkdirp.sync(h.parsePath('~/Pictures/splash_photos'));
		settings.set('path', h.parsePath('~/Pictures/splash_photos'));
		settings.set('askBeforeQuit', true);
		settings.set('user', os.homedir().split('/')[2]);
	}

	app.dock.setMenu(Menu.buildFromTemplate([
		{
			label: 'Clear First Run',
			click: () => frun.clear()
		}
	]));

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
	});
	splashScreen.loadURL(`file://${join(__dirname, 'app', 'splash.html')}`);

	indexWindow.on('ready-to-show', () => {
		splashScreen.hide();
		indexWindow.show();
		indexWindow.focus();
		h.checkUpdate();
	});

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
		app.on('activate', () => {
			indexWindow.show();
			clear();
		});
	}



	ipc.on('download', (e, text) => {
		if (text == 'random') {
			splash(settings.get('path'));
		} else {
			splashID(idParser(text), settings.get('path'));
		}
	});
	ipc.on('setPath', () => h.setDownloadPath());
	ipc.on('showPic', (e, p) => {
		shell.showItemInFolder(p);
	});
	ipc.on('setPic', (e, p) => {
		wallpaper.set(p);
	});
	ipc.on('openPic', (e, p) => {
		shell.openItem(p);
	});

	ipc.on('askBeforeQuit', (e, ask) => {
		settings.set('askBeforeQuit', ask);
	});

	ipc.on('restoreDefaults', () => {
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
				notify('Splash Desktop', {body: 'Settings will be restored next app launch.'});
				frun.clear();
			}
		});
	});
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
});


function redirecTo(pagename) {
	var focus = BrowserWindow.getFocusedWindow();
	focus.loadURL('file://' + join(__dirname, 'app', pagename + '.html'));

	return 'file://' + join(__dirname, 'app', pagename + '.html');
}
