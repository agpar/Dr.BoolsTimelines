var GraphicsEngineController = require('./worldgraphics/graphics-engine-controller')


$(document).ready(function () {
    var canvas = document.getElementById("simulation-render-target")
    var controller = GraphicsEngineController(canvas)

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
		window.onresize = function () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
		}
    
});
