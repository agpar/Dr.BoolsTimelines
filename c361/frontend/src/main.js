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

    //Open the actorInfo on the page.
    $("#open-actorinfo").click(function (event){
        $("#opened-actorinfo").show();
        $("#closed-actorinfo").hide();
        // $.ajax({
        //     type: "get",
        //     url: "/actors",
        //     contentType:"application/json",
        //     statusCode: {
        //         200: function(data)
        //         {
        //             $("#actorinfo-content").html(JSON.stringify(data, null, 4));
        //             $("#actorinfo").show();
        //             console.log(data);
        //         }
        //     }
        // })
    });

    //Close the actorInfo on the page
    $("#close-actorinfo").click(function (event){
        $("#opened-actorinfo").hide();
        $("#closed-actorinfo").show();
    });

    //Close the sidemenu on the page.
    $("#close-sidemenu").click(function (event){
        $("#opened-sidemenu").hide();
        $("#closed-sidemenu").show();

    });

    //Open the sideemnu on the page.
    $("#open-sidemenu").click(function (event){
        $("#opened-sidemenu").show();
        $("#closed-sidemenu").hide();
    });

    //Tiny button for closing the mainmenu.
    $("#close-mainmenu").click(function (event){
        $("#mainmenu").hide();
    });

    $("#load-game-side-btn").click(function (event){
        $("#mainmenu-header").html("Load a Game");
        $.ajax({
            type: "get",
            url: "/games/mine",
            contentType:"application/json",
            statusCode: {
                200: function(data)
                {
                    $("#mainmenu-content").html(JSON.stringify(data, null, 4));
                    $("#mainmenu").show();
                    console.log(data);
                }
            }
        })
    });
    $("#closed-sidemenu").hide();
    $("#opened-actorinfo").hide();
})
