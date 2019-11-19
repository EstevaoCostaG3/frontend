// myapp.js
var stats;
var timer;
var manifestUri = 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd';
// var manifestUri = 'https://yt-dash-mse-test.commondatastorage.googleapis.com/media/car-20120827-manifest.mpd';



const evaluator = {
	selectTrack: () => {},
	tracks: [],
	currentTrack: false,
	evaluate: () => {},
}

evaluator.evaluate = (filteredTracks, currentTrack) => {
	return filteredTracks[0]
}

evaluator.selectTrack = () => {
	console.log('selecting track')
	const currentTrack = evaluator.currentTrack

	var filteredTracks = player.evaluator.tracks

	filteredTracks = filteredTracks.filter(t => t.language === 'de')
	// filteredTracks = filteredTracks.sort((t1, t2) => t1.height > t2.height)
	
	const selectedTrack = evaluator.evaluate(filteredTracks, currentTrack)

	if(!currentTrack || selectedTrack.language !== currentTrack.language) {
		console.log(!currentTrack ? 'first' : 'changing language')
		// shaka.Player.prototype.selectTrack = selectedTrack
		player.selectVariantTrack(selectedTrack, true)
	} else {
		console.log('not first')
		// shaka.Player.prototype.selectTrack = selectedTrack
		player.selectVariantTrack(selectedTrack, false)
	}
	
	evaluator.currentTrack = filteredTracks[0]
	console.log('options: ', filteredTracks)
	console.log('selected: ', evaluator.currentTrack)
};

function initApp() {
	// Install built-in polyfills to patch browser incompatibilities.
	shaka.polyfill.installAll();
	
	// Check to see if the browser supports the basic APIs Shaka needs.
	if (shaka.Player.isBrowserSupported()) {
		// Everything looks good!
		initPlayer();
	} else {
		// This browser does not have the minimum set of APIs we need.
		console.error('Browser not supported!');
	}
}

function initPlayer() {
	// Create a Player instance.
	var video = document.getElementById('video');
	var player = new shaka.Player(video);

	// // Attach player to the window to make it easy to access in the JS console.
	window.player = player;
	player.evaluator = evaluator;
	
	
	// create a timer
	timer = new shaka.util.Timer(onTimeCollectStats)
	//stats = new shaka.util.Stats(video)
	
	
	video.addEventListener('ended', onPlayerEndedEvent)
	video.addEventListener('play', onPlayerPlayEvent)
	video.addEventListener('pause', onPlayerPauseEvent)
	video.addEventListener('progress', onPlayerProgressEvent)
	
	// // Listen for error events.
	player.addEventListener('error', onErrorEvent);
	// player.addEventListener('onstatechange',onStateChangeEvent);
	// player.addEventListener('buffering', onBufferingEvent);
	
	player.configure({
		abr: {
			enabled: false
		}
	})

	// Try to load a manifest.
	// This is an asynchronous process.
	player.load(manifestUri).then(function() {
		// This runs if the asynchronous load is successful.
		console.log('The video has now been loaded!');
		player.evaluator.tracks = player.getVariantTracks();
		console.log(player);
		console.log('tracks: ', evaluator.tracks);
		player.evaluator.selectTrack();
	}).catch(onError);  // onError is executed if the asynchronous load fails.
}

function onPlayerEndedEvent(ended) {
	console.log('Video playback ended', ended);
	timer.stop();
}

function onPlayerPlayEvent(play){
	console.log('Video play hit', play);
}

function onPlayerPauseEvent(pause){
	console.log('Video pause hit', pause);
}

function onPlayerProgressEvent(event) {
	console.log('Progress Event: ', event);
	window.player.evaluator.selectTrack();
}

function onErrorEvent(event) {
	// Extract the shaka.util.Error object from the event.
	onError(event.detail);
}

function onError(error) {
	// Log the error.
	console.error('Error code', error.code, 'object', error);
}

function onStateChangeEvent(state){
	console.log('State Change', state)
	if (state['state'] == "load"){
		timer.tickEvery(10);
	}
}

function onTimeCollectStats(){
	console.log('timer is ticking');
	console.log('switchings over last 10s',stats.getSwitchHistory());
}

function onBufferingEvent(buffering){
	bufferingEvent(buffering);
}

function bufferingEvent(buffering){
	console.log("Buffering: ", buffering);
}


document.addEventListener('DOMContentLoaded', initApp);
