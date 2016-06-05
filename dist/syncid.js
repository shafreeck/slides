//get sync id from window.location
//format url?file=filename&syncid=id
var query = window.location.href.split("?")[1]
var Filename, SyncID
if (query){
  var params = query.split('&')
  if (params.length == 2){
    var Filename = params[0].split('=')[1]
    var SyncID = params[1].split('=')[1]
  }
}

console.log("filename", Filename, "syncid", SyncID);
