const fs = require('fs');
const path = require('path');

const settings = require('electron-settings');
const {ipcRenderer} = require('electron');
const ipc = ipcRenderer;
const join = path.join;

var photos = fs.readdirSync(settings.get('path'));
const folder = settings.get('path');

photos.forEach(item => {
	if (checkPic(item)) {
		const picPath = join(folder, item);
		$('.grid').append(`
			<div class="item">
				<div data-path="${picPath}" data-action="open" class="split-left"></div>
				<div data-path="${picPath}" data-action="set" class="split-right"></div>
				<div data-path="${picPath}" data-action="show" class="split-bottom"></div>
				<img src="${picPath}">
			</div>
		`);
	}
});


$('[data-path]').each(function() {
	$(this).click(() => {
		if ($(this).attr('data-action') == 'set') {
			var path = $(this).attr('data-path');
			ipc.send('setPic', path);
		} if ($(this).attr('data-action') == 'show') {
			var path = $(this).attr('data-path');
			ipc.send('showPic', path);
		} if ($(this).attr('data-action') == 'open') {
			var path = $(this).attr('data-path');
			ipc.send('openPic', path);
		}
	});
});



$('[data-bg]').each(function(i) {
	$(this).css({
		width: '200px',
		height: '200px',
		background: 'red'
	});
});

function checkPic(text) {
	if (text.split('.')[1] == 'jpg' && text.split('.')[0].length == 11) {
		return true;
	}

	return false;
}

$(window).on('load', () => {
	$('.spinner-container').animate({
		opacity: 0
	}, 500, () => {
		$('.spinner-container').css('display', 'none');
		setTimeout(function () {
			$('#content').css('display', 'block');
			$('.item').each(function() {
				var imgH = $(this).find('> img').css('height');
				$(this).css('max-height', imgH );
			});
		}, 50);
	});
});
