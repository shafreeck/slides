//load the resources
require('./index.html')
require('./slides.json')
require('./slides/example.md')
require('./slides/remarkjs.md')
require('./css/slide.css')
require('materialize-css/bin/materialize.css')

var $ = window.jQuery = require('jquery')
require('materialize-css')

var Clipboard = require('clipboard')
var sync = require('./syncid.js')
require('./remark.js')

var Vue = require('vue')

var Filename = sync.Filename
var SyncID = sync.SyncID

var uuid = require('uuid')
var mqtt = require('mqtt')

var currentSlide = {name:Filename, id: SyncID}
var topic = ""
var clientID = uuid.v1()

//init the materialize-css sideNav
$('#slide-out-btn').sideNav()
var clip = new Clipboard('#sharebtn')
clip.on('success', function(e){
  console.log('clipboard success');
})
clip.on('error', function(e){
  console.log('clipboard success');
})

//connect to mqtt broker
//var client  = mqtt.connect('ws://124.243.219.195:8081/mqtt');
var client  = mqtt.connect('ws://test.mosquitto.org:8080');
//var client  = mqtt.connect('ws://172.17.0.2:9000/mqtt');

//side view to list markdown files
var sideView = new Vue({
  el: "#sideview",
  data: {
    files: []
  },
  methods: {
    openmd: function(file){
       console.log(file);
       currentSlide.name = file.name
       currentSlide.id = file.id
       $('#slide-out-btn').sideNav('hide')
       //remove the exist dom
       $('#slide-show').remove()

       //recreate the dom
       var e = $('<div id="slide-show" style="height:100%;width:100%" tabindex="0"></div>')
       $('#slide-show-container').append(e)

       //set focus on slide-show
       e.focus()

       //fix the remarkjs's short key
       //hack it to clone a page
       e.keypress(function(event){
         if (event.key === 'c'){
           window.location.href= window.location.origin + window.location.pathname
            + "?filename=" + currentSlide.name + "&syncid="
            + currentSlide.id
         }
       })
       //create slide in slide-show
       var slideshow = remark.create({
         container: document.getElementById("slide-show"),
         sourceUrl:file.name
       });

       //setup slide event handler
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
       //setup message handler
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
       //unsubscribe last topic
       if (topic) {
         client.unsubscribe(topic)
       }

       //subscribe to new topic
       topic = "/slide/sync/"+file.id
       client.subscribe(topic)
    }
  }
})
//share slide by url
var sync = new Vue({
  el: "#shafreeck-syncid",
  data: {
    shareURL: "",
  }
})

$('#modal-trigger').leanModal({
  ready: function(){
    sync.shareURL = window.location.origin + window.location.pathname
    + "?filename=" + currentSlide.name + "&syncid="
    + currentSlide.id
    console.log(sync.shareURL);
  },
  complete: function(){
    //reset the focus on slide show
    $('#slide-show').focus()
  }
})

$.get("slides.json", "", function(files){
  console.log(files);
  for (i in files) {
    sideView.files.push({name: files[i].path, id: uuid.v1()})
  }
  //open the first slide
  if (!currentSlide.name && files[0]){
    sideView.openmd(sideView.files[0])
  }
})

//open if it supplies filename and syncid
if(currentSlide.name && currentSlide.id){
  sideView.openmd(currentSlide)
}
