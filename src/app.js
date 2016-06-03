require('./css/slide.css')
require('../node_modules/vue-material-components/assets/css/materialize.min.css')

var mqtt = require('mqtt')
var uuid = require('uuid')
var Vue = require('vue')
var clientID = uuid.v1()
var vmc = require('vue-material-components')
Vue.use(vmc)

console.log("clientID", clientID);

var client  = mqtt.connect('ws://124.243.219.195:8081/mqtt');
//var client  = mqtt.connect('ws://test.mosquitto.org:8080');
//var client  = mqtt.connect('ws://172.17.0.2:9000/mqtt');
var topic = '/slide/sync/'

if (syncID){
  topic = topic + syncID
}else{
  topic = topic + clientID
}
var slideshow = remark.create({
  sourceUrl:"example.md"
});

var sync = new Vue({
  el: "#shafreeck-syncid",
  mixins:vmc.mixins,
  
  methods: {
    shareSyncID: function(){
      var shareURL = window.location.href + "?" + clientID
      this.toast(shareURL, 4000)
    },
  }
})

client.on('connect', function () {
  console.log('subscribe to topic ', topic)
  client.subscribe(topic);
});
client.on('message', function (topic, message) {
  // message is Buffer
  slide = JSON.parse(message.toString())
  console.log('get message',slide);
  currentIndex = slideshow.getCurrentSlideIndex()
  if (clientID != slide.sender && currentIndex != slide.index) {
    console.log("go to ", slide.index + 1);
    slideshow.gotoSlide(slide.index+1)
    slideshow.follow = true
  }
});

slideshow.on('showSlide', function (slide) {
  // Slide is the slide being navigated to
  var idx = slide.getSlideIndex();
  var msg = {index: idx, sender:clientID}
  if (!slideshow.follow){
    client.publish(topic, JSON.stringify(msg))
  }
  slideshow.follow = false
  console.log("publish", topic, msg);
});
