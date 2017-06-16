const {ipcRenderer} = require('electron');
const ipc = ipcRenderer;

$(document).ready(function() {

	$('#downloadPath').click(() => {
		ipc.send('setPath', '');
	})

});
