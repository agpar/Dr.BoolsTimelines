var GraphicsEngineController = require('./worldgraphics/graphics-engine-controller')

var GAMEID
$(document).ready(function () {
    var canvas = document.getElementById("simulation-render-target")
    var controller = GraphicsEngineController(canvas)

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

    $("#add-raise").click(function (evt){controller.setUse("ADD")})
    $("#delete-lower").click(function (evt){controller.setUse("DELETE")})
    $("#camera").click(function (evt){controller.setTool("CAMERA")})
    $("#inspect").click(function (evt){controller.setTool("INSPECT")})

});
