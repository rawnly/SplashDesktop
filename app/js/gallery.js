const fs = require('fs');
const path = require('path');

const wallpaper = require('wallpaper');
const settings = require('electron-settings');
const {app, shell} = require('electron');

const join = path.join;

var grid = $('.flex');
var photos = fs.readdirSync(settings.get('path'));
var pics = [];
const folder = settings.get('path');

photos.forEach(item => {
	if (checkPic(item)) {
		const picPath = join(folder, item);
		$('.grid').append(`<a class="item" href="${picPath}"><img src="${picPath}"></a>`)
	}
})

$('[data-bg]').each(function(i) {
	$(this).css({
		width: '200px',
		height: '200px',
		background: 'red'
	});
})

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
		$('.spinner-container').css('display', 'none')
		setTimeout(function () {
			$('#content').css('display', 'block')
		}, 500);
	})
})
