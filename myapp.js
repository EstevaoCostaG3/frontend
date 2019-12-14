// myapp.js
var stats;
var timer;
var manifestUri =
    'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd';

class Event{
  constructor(){
    this.logs = {};
  }
  set(key, records){
    this.logs[key]=records
  }
  get(key){
    return this.logs[key]
  }
  push(key, value){
    let isKeyInLogs = key in this.logs
    if (isKeyInLogs){
      this.logs[key].push(value)
    }else{
      this.logs[key] = [value]
    }
  }
  dump(){
    return this.logs;
  }
};

let enableABR = true;

let evaluator = {
  currentTrack: false,
  averageBandwidth: BigInt(0),
  n: 0,
  calculateAverage : function(bandwidthEstimated){
    this.n = this.n + 1;
    let intPartOfBandwidthEstimated = bandwidthEstimated.toString().split('.')[0];
    this.averageBandwidth = (BigInt(this.n - 1) * this.averageBandwidth + BigInt(intPartOfBandwidthEstimated)) / BigInt(this.n);
    
    if(this.n == 20){
      this.n = 0;
      console.info("reset bandwidth average");
    }
  },
  evaluate: function(tracks, bandwidthEstimated){
    this.calculateAverage(bandwidthEstimated);
    console.info('averageBandwidth:', this.averageBandwidth);
    if(this.averageBandwidth < tracks[0].bandwidth){
      return tracks[0];
    }
    let i = 0;
    while(i < tracks.length && tracks[i].bandwidth < this.averageBandwidth){
      i++;
    }
    return tracks[i - 1];
  }
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

let events = ['abort','canplay','canplaythrough','durationchange', 
'emptied','ended','error','interruptbegin','interruptend','loadeddata',
'loadedmetadata','loadstart','mozaudioavailable','pause','play',
'playing','progress','ratechange','seeked','seeking','stalled',
'suspend','timeupdate','volumechange','waiting'];

function initPlayer() {
  // Create a Player instance.
  var video = document.getElementById('video');
  var player = new shaka.Player(video);

  // Attach player to the window to make it easy to access in the JS console.
  window.player = player;
  player.evaluator = evaluator;

  // create a timer
  timer = new shaka.util.Timer(onTimeCollectStats)
  //stats = new shaka.util.Stats(video)

  let videoEvents = new Event();
  events.forEach(eventType => {
    video.addEventListener(eventType, event => {
      videoEvents.push(event.type, event.timeStamp);
      if(event.type == 'ended'){
        timer.stop();
      }
    });

  });

  player.addEventListener('error', onErrorEvent);

	player.configure({
		abr: {
			enabled: enableABR,
			switchInterval: 1,
		}
  });

  // Try to load a manifest.
  // This is an asynchronous process.
  player.load(manifestUri).then(function() {
    // This runs if the asynchronous load is successful.
    console.log('The video has now been loaded!');

    player.abrManager_.chooseVariant = function() {
      // ordena as versões (variantes) de forma ascendente pelo seu tamanho
      let tracks =  this.variants_.sort((t1, t2) => t1.video.height > t2.video.height);
      
      let selectedTrack = evaluator.evaluate(tracks, this.getBandwidthEstimate());
      return selectedTrack;
    };

  }).catch(onError);  // onError is executed if the asynchronous load fails.
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
