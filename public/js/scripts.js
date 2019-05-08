function SaveResults(arg) { // rename
	/* arg will be the json message to be saved */
	const gameId = $("[data-gameid]")[0].attributes[1].value
	const studentId = $("[data-studentid]")[0].attributes[2].value

	$.post( "/games/data/" + gameId + "/" + studentId, { results: arg } )
}

$(document).ready(function () {

	/* Basic listening for clicks on certain buttons */

	$('#add-word-spelling').on('click', function () {
		var wordsDiv = $('.wordsInGame');
		wordsDiv.append('<div class="uk-margin"><div class="uk-inline"><input class="uk-input" type="text" name="words" /><button class="uk-form-icon uk-form-icon-flip delete-word" uk-icon="icon: close" type="button"></button></div></div>');
	});

	$('#add-word-math').on('click', function () {
		var wordsDiv = $('.problemsInGame');
		wordsDiv.append('<div class="uk-margin"><div class="uk-inline"><input class="uk-input" type="text" name="problems" /><button class="uk-form-icon uk-form-icon-flip delete-problem" uk-icon="icon: close" type="button"></button></div></div>');
	});

	$('.spelling-game ').on('click', '.delete-word', function () {
		$(this).closest(".uk-margin").remove();
	});

	$('.math-game ').on('click', '.delete-problem', function () {
		$(this).closest(".uk-margin").remove();
	});


	/* Game communcation */

	/* 
		1. GET request game data from server. done
		2. loadGame() with game data JSON string done
		3. save game data with function "SayHello" (rename).
	*/

	function loadGame(gameType, gameData) {
		if (gameType == 'spelling') {
			var myGame = UnityLoader.instantiate($(".new-game-frame")[0], "/public/games/spelling/Build/TypingFinalBuild.json", {
				onProgress: (gameInstance, progress) => {
					if (progress == 1) {
						console.log("game is loaded")
						console.log(gameInstance)
						gameInstance.SendMessage("GameMgr", "SetGameData", JSON.stringify(gameData));
					}
				}
			});
		} else if (gameType == 'math') {
			var myGame = UnityLoader.instantiate($(".new-game-frame")[0], "/public/games/math/Build/FinalBuild.json", {
				onProgress: (gameInstance, progress) => {
					if (progress == 1) {
						console.log("game is loaded")
						console.log(gameInstance)
						gameInstance.SendMessage("GameMgr", "SetGameData", JSON.stringify(gameData));
					}
				}
			});
		}
		
	}



	if ($(".new-game-frame").length) {
		// get game id from element data
		const gameId = $("[data-gameid]")[0].attributes[1].value
		const gameType = $("[data-gametype]")[0].attributes[3].value

		$.get( "/games/data/" + gameId, function( data ) {
			console.log("game data:");
			console.log(data);
			loadGame(gameType, data);
		});
	}
});