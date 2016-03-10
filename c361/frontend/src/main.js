var GraphicsEngineController = require('./worldgraphics/graphics-engine-controller')


$(document).ready(function () {
    var canvas = document.getElementById("simulation-render-target")
    var controller = GraphicsEngineController(canvas)

    var body = document.getElementsByTagName("body")[0]
		canvas.height = window.innerHeight - body.style.height
		window.onresize = function () {
			canvas.height = window.innerHeight - body.style.height
		}
})
