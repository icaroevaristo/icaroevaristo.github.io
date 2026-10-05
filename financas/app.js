(function () {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "./app.core.js", false);
  xhr.send(null);
  if (xhr.status >= 200 && xhr.status < 300) {
    (0, eval)(xhr.responseText);
  } else {
    console.error("Failed to load app.core.js", xhr.status);
  }
})();
