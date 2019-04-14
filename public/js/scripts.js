function SayHello(arg) {
	// show the message
	alert(arg);
}
$(document).ready(function () {

	$('#add-word').on('click', function () {
		var wordsDiv = $('.wordsInGame');
		wordsDiv.append('<div class="uk-margin"><div class="uk-inline"><input class="uk-input" type="text" name="words" /><button class="uk-form-icon uk-form-icon-flip delete-word" uk-icon="icon: close" type="button"></button></div></div>');
	});

	$('.spelling-game ').on('click', '.delete-word', function () {
		$(this).closest(".uk-margin").remove();
	});

	
	function myProgress(gameInstance, progress) {
		if (progress == 1) {
			console.log("game is loaded")
			console.log(gameInstance)
			gameInstance.SendMessage("Main Camera", "SetGameData", "Hello from the web page!");
		}
	}

	function loadGame() {
		var myGame = UnityLoader.instantiate($(".new-game-frame")[0], "http://localhost:5000/public/games/spelling/Build/testBuild.json", {
			onProgress: myProgress
		});
	}

	if ($(".new-game-frame").length) {
		loadGame()
	}
});