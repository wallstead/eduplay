$(document).ready(function() {
	
	$('#add-word').on('click', function () {
		var wordsDiv = $('.wordsInGame');
		wordsDiv.append('<div class="uk-margin"><div class="uk-inline"><input class="uk-input" type="text" name="words" /><button class="uk-form-icon uk-form-icon-flip delete-word" uk-icon="icon: close" type="button"></button></div></div>');
	});

	$('.spelling-game ').on('click','.delete-word', function() {
		$(this).closest( ".uk-margin" ).remove();
	});
});
