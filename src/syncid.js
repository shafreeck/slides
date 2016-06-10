//get sync id from window.location
//format url?file=filename&syncid=id
var Filename, SyncID
if (typeof window != undefined){
  var query = window.location.href.split("?")[1]
  if (query){
    var params = query.split('&')
    if (params.length == 2){
      var Filename = params[0].split('=')[1]
      var SyncID = params[1].split('=')[1]
    }
  }

}
console.log("filename", Filename, "syncid", SyncID);
exports.Filename = Filename
exports.SyncID = SyncID
