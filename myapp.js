// myapp.js
var stats;
var timer;
var manifestUri =
    'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd';

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


  // create a timer
   timer = new shaka.util.Timer(onTimeCollectStats)
   //stats = new shaka.util.Stats(video)


   video.addEventListener('ended', onPlayerEndedEvent)
   video.addEventListener('play', onPlayerPlayEvent)
   video.addEventListener('pause', onPlayerPauseEvent)


  // // Attach player to the window to make it easy to access in the JS console.
  // window.player = player;
  //
  // // Listen for error events.
  // player.addEventListener('error', onErrorEvent);
  // player.addEventListener('onstatechange',onStateChangeEvent);
  // player.addEventListener('buffering', onBufferingEvent);


  // Try to load a manifest.
  // This is an asynchronous process.
  player.load(manifestUri).then(function() {
    // This runs if the asynchronous load is successful.
    console.log('The video has now been loaded!');
  }).catch(onError);  // onError is executed if the asynchronous load fails.
}

function onPlayerEndedEvent(ended){
  console.log('Video playback ended', ended);
  timer.stop();
}

function onPlayerPlayEvent(play){
  console.log('Video play hit', play);
}

function  onPlayerPauseEvent(pause){
  console.log('Video pause hit', pause);
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
