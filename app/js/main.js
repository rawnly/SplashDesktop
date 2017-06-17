$(document).ready(function() {
  $('body').fadeIn();

	$('nav ul li a').click(function(e) {
		var url = $(this).attr('data-href');
		if (url != '#') {
			$('body').fadeOut();
			window.location.replace(url);
		}
	})

	$('a').click(function(){
	  $('html, body').animate({
	    scrollTop: $('[id="' + $.attr(this, 'href').substr(1) + '"]').offset().top
	  }, 500);
	  return false;
	});
});
