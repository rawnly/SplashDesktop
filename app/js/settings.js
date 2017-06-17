const {ipcRenderer} = require('electron');
const settings = require('electron-settings');

const ipc = ipcRenderer;

$(document).ready(function() {

	if ( !settings.get('askBeforeQuit') ) {
		$('#askBeforeQuit').removeClass('active')
	}

	$('#downloadPath').click(() => {
		ipc.send('setPath', '');
	})

	$('#askBeforeQuit').click(() => {
		$('#askBeforeQuit').toggleClass('active');
		ipc.send('askBeforeQuit', $('#askBeforeQuit').hasClass('active'))
	})

	$('#restoreDefaults').click(() => {
		ipc.send('restoreDefaults')
	})

});
