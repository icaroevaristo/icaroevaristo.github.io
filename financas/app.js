(function () {
  var urls = ["./app.part0.b64", "./app.part1.b64", "./app.part2.b64"];
  var chunks = [];
  for (var i = 0; i < urls.length; i++) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", urls[i], false);
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) {
      console.error("Failed to load", urls[i], xhr.status);
      return;
    }
    chunks.push(String(xhr.responseText).replace(/\s+/g, ""));
  }
  (0, eval)(atob(chunks.join("")));
})();
