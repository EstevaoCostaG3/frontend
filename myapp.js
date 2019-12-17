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

const environment = {
  log: { url: 'http://localhost:3000' }
};

class Logger {
  constructor(userId, sessionId) {
      this.userId = userId;
      this.sessionId = sessionId;
  }
  debug(primaryMessage, ...supportingData) {
      this.emitLogMessage("debug", primaryMessage, supportingData);
  }
  warn(primaryMessage, ...supportingData) {
      this.emitLogMessage("warn", primaryMessage, supportingData);
  }
  error(primaryMessage, ...supportingData) {
      this.emitLogMessage("error", primaryMessage, supportingData);
  }
  info(primaryMessage, ...supportingData) {
      this.emitLogMessage("info", primaryMessage, supportingData);
  }
  emitLogMessage(msgType, msg, supportingDetails) {
      let body = { 'msgType': msgType,
          'msg': msg,
          'userId': this.userId,
          'sessionId': this.sessionId,
          'log': supportingDetails[0]
      };
      console.info('body: ', JSON.stringify(body));
      fetch(environment.log.url + '/events', {
          headers: { "Content-Type": "application/json; charset=utf-8",
              "Authorization": "Bearer " + this.sessionId
          },
          method: 'POST',
          body: JSON.stringify(body)
      }).then(response => response.json())
          .then(json => console.info(json))
          .catch(error => {
            console.error(error);
      });
  }
}

const email = 'icc453@icomp';
const password = 'batman';

class CredentialManager {
  static login(email, password){
    let body = {
        'email':email,
        'password':password
    }
    return new Promise((resolve, reject) => {
        fetch(environment.log.url+'/users/authenticate', {
            headers: { "Content-Type": "application/json; charset=utf-8" },
            method: 'POST',
            body: JSON.stringify(body)
        })
        .then(response=>response.json())
        .then(json=>{
            console.info('accessToken:', json['accessToken']);
            const credential = new CredentialManager();
            credential['_token'] = json['accessToken'];
            resolve(credential)
        })
        .catch(error=>{
            reject(error);
        })
    });
  }
}

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
        CredentialManager.login(email, password).then(function (credential) {
          logger = new Logger(email, credential._token);
          try {
            let stats = player.getStats();
            videoEvents.push("SDelay", stats.loadLatency);
            stats.switchHistory.forEach(track => {
              if(track.type == "variant"){
                videoEvents.push("BSwitch", track.timestamp);
              }
            });
            logger.info('videoEvents', videoEvents.dump());
          }catch(error){
              console.error(error);
          }
        }).catch(function (error) {
            console.error('Failed to log in');
            throw error;
        });
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
