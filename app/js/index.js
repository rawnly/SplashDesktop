const {ipcRenderer} = require('electron');
const ipc = ipcRenderer;

$('#download').on('click', () => {
	ipc.send('download', $('#idOrUrl')[0].value)
});

$('#random').on('click', () => {
	ipc.send('download', 'random')
});
