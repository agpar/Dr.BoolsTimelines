var GraphicsEngineController = require('./worldgraphics/graphics-engine-controller')

var GAMEID
$(document).ready(function () {
    var canvas = document.getElementById("simulation-render-target")
    var controller = GraphicsEngineController(canvas,  "div#sim-ui-container")

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
		window.onresize = function () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
		}

    $("#toolbar-bottom .tool").click(function (evt) {
        $("#toolbar-bottom .tool").removeClass("selected")
        $(this).addClass("selected")
    })
    $("#toolbar-bottom .modifier").click(function (evt) {
        $("#toolbar-bottom .modifier").removeClass("selected")
        $(this).addClass("selected")
    })
});
