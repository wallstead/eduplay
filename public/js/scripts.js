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

	// var unityObjectUrl = "http://webplayer.unity3d.com/download_webplayer-3.x/3.0/uo/UnityObject2.js";
	// if (document.location.protocol == 'https:')
	// 	unityObjectUrl = unityObjectUrl.replace("http://", "https://ssl-");
	// document.write('<script type="text/javascript" src="http://webplayer.unity3d.com/download_webplayer-3.x/3.0/uo/UnityObject2.js"></script>');

	// function SayHello(arg) {
	// 	// show the message
	// 	alert(arg);
	// }

	// var u = new UnityObject2();
	// console.log($(".new-game-frame")[0])
	var myGame = UnityLoader.instantiate($(".new-game-frame")[0], "http://localhost:5000/public/games/spelling/Build/testBuild.json", {
		onProgress: myProgress
	});

	function myProgress(gameInstance, progress) {
		// console.log(progress)
		if (progress == 1) {
			console.log("game is loaded")
			console.log(gameInstance)
			gameInstance.SendMessage("Main Camera", "SetGameData", "Hello from the web page!");
			myGame.SendMessage("Main Camera", "SetGameData", "Hello from the web page2!");
			// SendMessage("Main Camera", "SetGameData", "Hello from the web page3!");
		}
	}

	console.log(myGame)

	// myGame.onProgress(function (progress) {
	// 	console.log("progress: " + progress)
	// 	var $missingScreen = jQuery(progress.targetEl).find(".missing");
	// 	switch (progress.pluginStatus) {
	// 		case "unsupported":
	// 			// u.showUnsupported();
	// 			break;
	// 		case "broken":
	// 			alert("You will need to restart your browser after installation.");
	// 			break;
	// 		case "missing":
	// 			$missingScreen.find("a").click(function (e) {
	// 				e.stopPropagation();
	// 				e.preventDefault();
	// 				u.installPlugin();
	// 				return false;
	// 			});
	// 			$missingScreen.show();
	// 			break;
	// 		case "installed":
	// 			$missingScreen.remove();
	// 			break;
	// 		case "first":
	// 			console.log("started")
	// 			myGame.SendMessage("TextText", "SetGameData", "Hello from the web page!");
	// 			break;
	// 	}
	// });

	// u.initPlugin(jQuery(".gameframe")[0], "Example.unity3d");
});