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
    $("#terrain").click(function (evt){controller.setTool("TERRAIN")})
    $("#grass").click(function (evt){controller.setTool("GRASS")})
    $("#rock").click(function (evt){controller.setTool("ROCK")})
    $("#water").click(function (evt){controller.setTool("WATER")})
    $("#plant").click(function (evt){controller.setTool("PLANT")})
    $("#mushroom").click(function (evt){controller.setTool("MUSHROOM")})
    $("#wall").click(function (evt){controller.setTool("WALL")})
    $("#block").click(function (evt){controller.setTool("BLOCK")})
    $("#actor").click(function (evt){controller.setTool("ACTOR")})

});
