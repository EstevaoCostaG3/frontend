// myapp.js
var stats;
var timer;
var manifestUri = 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd';
// var manifestUri = 'https://yt-dash-mse-test.commondatastorage.googleapis.com/media/car-20120827-manifest.mpd';

// if disabled, you can choose variants using player.selectVariantTrack(track: Variant, clearBuffer: boolean)
const enableABR = true

const evaluator = {
	currentTrack: false,
	evaluate: () => {},
}

// Adaptation Strategy
evaluator.evaluate = (tracks) => {
	// if first select the lower variant
	selected = tracks[0]

	/*
	 * Insert here you adaptation strategy
	 */

	return selected
}

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
	
	// Attach player to the window to make it easy to access in the JS console.
	window.player = player;
	// Attach evaluator to player to manage useful variables
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
	
	// configure player: see https://github.com/google/shaka-player/blob/master/docs/tutorials/config.md
	player.configure({
		abr: {
			enabled: enableABR,
			switchInterval: 1,
		}
	})
	
	/**
	 * Default SimplesAbrManager.prototype.chooseVariant code
	 * @override
	 */
	// shaka.abr.SimpleAbrManager.prototype.chooseVariant = function() {
	// 	const SimpleAbrManager = shaka.abr.SimpleAbrManager;
	// 	// Get sorted Variants.
	// 	let sortedVariants = SimpleAbrManager.filterAndSortVariants_(
	// 		this.config_.restrictions, this.variants_
	// 	);
	// 	let currentBandwidth = this.bandwidthEstimator_.getBandwidthEstimate(
	// 			this.config_.defaultBandwidthEstimate
	// 	);
	// 	if (this.variants_.length && !sortedVariants.length) {
	// 		// If we couldn't meet the ABR restrictions, we should still play something.
	// 		// These restrictions are not "hard" restrictions in the way that top-level
	// 		// or DRM-based restrictions are.  Sort the variants without restrictions
	// 		// and keep just the first (lowest-bandwidth) one.
	// 		shaka.log.warning('No variants met the ABR restrictions. ' +
	// 		'Choosing a variant by lowest bandwidth.');
	// 		sortedVariants = SimpleAbrManager.filterAndSortVariants_(
	// 			/* restrictions */ null, this.variants_);

	// 		sortedVariants = [sortedVariants[0]];
	// 	}
					
	// 	// Start by assuming that we will use the first Stream.
	// 	let chosen = sortedVariants[0] || null;
	// 	for (let i = 0; i < sortedVariants.length; ++i) {
	// 		let variant = sortedVariants[i];
	// 		let nextVariant = sortedVariants[i + 1] || {bandwidth: Infinity};
	// 		let minBandwidth = variant.bandwidth /
	// 		this.config_.bandwidthDowngradeTarget;
	// 		let maxBandwidth = nextVariant.bandwidth /
	// 		this.config_.bandwidthUpgradeTarget;
	// 		shaka.log.v2('Bandwidth ranges:',
	// 		(variant.bandwidth / 1e6).toFixed(3),
	// 		(minBandwidth / 1e6).toFixed(3),
	// 		(maxBandwidth / 1e6).toFixed(3));
	// 		if (currentBandwidth >= minBandwidth && currentBandwidth <= maxBandwidth) {
	// 			chosen = variant;
	// 		}
	// 	}
	// 	this.lastTimeChosenMs_ = Date.now();
	// 	console.log('JAÇSLKFHJKADLFHKLJSDHFO')
	// 	return chosen;
	// };

	/**
	 * Our SimplesAbrManager.prototype.chooseVariant code
	 * @override
	 */
	shaka.abr.SimpleAbrManager.prototype.chooseVariant = function() {
		// get variants list and sort down to up
		var tracks =  this.variants_.sort((t1, t2) => t1.video.height - t2.video.height)

		
		console.log('tracks: ', this.variants_)
		const selectedTrack = evaluator.evaluate(tracks)
		
		evaluator.currentTrack = selectedTrack
		console.log('options: ', tracks)
		console.log('selected: ', evaluator.currentTrack)
		return evaluator.currentTrack
	}
				
	// Try to load a manifest.
	// This is an asynchronous process.
	player.load(manifestUri).then(function() {
		// This runs if the asynchronous load is successful.
		console.log('The video has now been loaded!');

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
