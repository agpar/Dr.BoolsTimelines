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

    $("#toolbar-bottom .tool").click(function (evt) {
        $("#toolbar-bottom .tool").removeClass("selected")
        $(this).addClass("selected")
    })
    $("#toolbar-bottom .modifier").click(function (evt) {
        $("#toolbar-bottom .modifier").removeClass("selected")
        $(this).addClass("selected")
    })

    $("#add-raise").click(function (evt){CONTROLLER.setUse("ADD")})
    $("#delete-lower").click(function (evt){CONTROLLER.setUse("DELETE")})
    $("#camera").click(function (evt){CONTROLLER.setTool("CAMERA")})
    $("#inspect").click(function (evt){CONTROLLER.setTool("INSPECT")})

    $(document).trigger("loadview", [])
});
