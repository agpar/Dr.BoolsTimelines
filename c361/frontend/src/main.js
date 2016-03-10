var GraphicsEngineController = require('./worldgraphics/graphics-engine-controller')


$(document).ready(function () {
    var canvas = document.getElementById("simulation-render-target")
    var controller = GraphicsEngineController(canvas)

    var body = document.getElementsByTagName("body")[0]
		canvas.width = window.innerWidth
    canvas.height = window.innerHeight

		window.onresize = function () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
		}
})
