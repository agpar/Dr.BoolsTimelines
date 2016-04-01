var GraphicsEngineController = require('./worldgraphics/graphics-engine-controller')

$(document).ready(function () {
    var canvas = document.getElementById("simulation-render-target")
    window.CONTROLLER = GraphicsEngineController(canvas,  "div#sim-ui-container")

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
		window.onresize = function () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
		}
    
    $(document).trigger("loadview", [])
});
