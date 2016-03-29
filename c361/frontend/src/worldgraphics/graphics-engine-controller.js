var Class = require("easejs").Class
var WorldRenderer = require("./world-renderer")
//var TimelineFetcher = require("../networking/timeline-fetcher").new()
//var WorldStateFetcher = require("../networking/world-state-fetcher").new()

/*
GraphicsEngineController: Holds the state of the camera, listens for input events
and controlls the render engine accordingly. This class also keeps track of
the time stream that the client's simulation is currently in and applies state
change operations to the renderer to move the view through time.

param renderTarget: The DOM element that the rendering engine will be bound to.
*/
module.exports = Class("GraphicsEngineController", {
    'private _gameID': undefined,
    'private _activeActor': undefined,
    'private _is_hosting': undefined,
    'private _gameTitle': undefined,
    'private _updateLoop': null,
    'private _renderEngine': null,
    'private _camera': null,
    'private _camPos': null,
    'private _renderer': null,
    'private _smellMode': false,
    'private _timeLine': null,
    'private _currentTurn': 0,
    'private _rtarget': null,
    'private _tool': "CAMERA",
    'private _use': "ADD",

    'private _popupStats': function (stats) {
        $('#cell-stats').show()

        $("div#cell-stats span#elevation").html(Math.round(100*stats.elevation)/100 + " meters");
        $("div#cell-stats span#cell-type").html(stats.type);
        $("div#cell-stats span#coords").html(stats.coords.x +  ", " + stats.coords.y );
        $("div#cell-stats div#stat-listing").empty();
        $("div#cell-stats div#stat-listing").append("<h4>Contents:</h4>");

        for (var i in stats.contents) {
            var cont = stats.contents[i];
            var element = $("<div class='cell-content-list'> </div>");
            var health = cont.health;
            var type = cont.type;

            $("<span> Type: </span><span id='type'>" + type + "</span><br>").appendTo(element);
            $("<span> Health: </span><span id='health'>" + health + "</span>").appendTo(element);

            $("div#stat-listing").append(element);
        }


    },
    /*
    Bind key events to camera or interaction actions

    param scene: The scene for which the events are fire from.
    */
    'private _setupKeys': function(scene) {
        scene.actionManager = new BABYLON.ActionManager(scene)
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger,
            function (evt) {
                if(evt.sourceEvent.keyCode==16) {
                    this._camera.angularSensibilityX = 1000000000
                    this._camera.angularSensibilityY = 1000000000
                }
            }.bind(this)
        ))

        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger,
            function (evt) {
                if(evt.sourceEvent.keyCode==16) {
                    this._camera.angularSensibilityX = 1500
                    this._camera.angularSensibilityY = 1500
                }
            }.bind(this)
        ))
    },
    __construct: function(renderTarget) {
        var engine = new BABYLON.Engine(renderTarget, true)
        var scene  = new BABYLON.Scene(engine)
        var loader = new BABYLON.AssetsManager(scene)

        var camera = new BABYLON.ArcRotateCamera("camera", Math.PI/8,Math.PI/8,45, new BABYLON.Vector3(0,0,0), scene)
        camera.upperRadiusLimit = 55
        camera.lowerRadiusLimit = 15
        camera.upperBetaLimit = Math.PI/3
        camera.lowerBetaLimit = Math.PI/8

        camera.keysUp = []
        camera.keysDown = []
        camera.keysLeft = []
        camera.keysRight = []

        camera.panningSensibility = 100
        camera.angularSensibilityX = 1500
        camera.wheelPrecision = 25
        camera.attachControl(renderTarget)

        var renderer = WorldRenderer(renderTarget, engine, camera, scene, loader)

        this._renderEngine = engine
        this._camera = camera
        this._camPos = {x: 0, y: 0}
        this._renderer = renderer

        this._setupKeys(scene)
        this.startSimulationEngine()

        $("#simulation-render-target").click(function(evt){
            var picked = scene.pick(evt.clientX, evt.clientY)
            var coords = picked.pickedMesh.name.split(" ").map(function(x){return Number(x)})
            if(evt.ctrlKey)
                return
            if (this._tool == "CAMERA") {
                this._camera.angularSensibilityX = 1500
                this._camera.angularSensibilityY = 1500
            }
            else {
                this._camera.angularSensibilityX = 1000000000
                this._camera.angularSensibilityY = 1000000000

                if(this._tool == "INSPECT") {
                    console.log("INS")

                    stats = this._renderer.getCell(coords[0], coords[1])
                    console.log(stats)
                    this._popupStats(stats)
                }
                else {
                    if(this._use == "ADD") {
                        if (this._tool == "TERRAIN") {
                            console.log("RAI_TER")
                        }
                        else if (this._tool == "GRASS") {
                            console.log("ADD_GRA")
                        }
                        else if (this._tool == "ROCK") {
                            console.log("ADD_ROC")
                        }
                        else if (this._tool == "WATER") {
                            console.log("ADD_WAT")
                        }
                        else if (this._tool == "PLANT") {
                            console.log("ADD_PLA")
                        }
                        else if (this._tool == "MUSHROOM") {
                            console.log("ADD_MUS")
                        }
                        else if (this._tool == "WALL") {
                            console.log("ADD_WAL")
                        }
                        else if (this._tool == "BLOCK") {
                            console.log("ADD_BLO")
                        }
                        else if (this._tool == "ACTOR") {
                            console.log("ADD_ACT")
                            this._spawnActor(coord[0],coords[1])
                        }
                    }
                    else if(this._use == "DELETE") {
                        if (this._tool == "TERRAIN") {
                            console.log("LOW_TER")
                        }
                        else if (this._tool == "GRASS") {
                            console.log("DEL_GRA")
                        }
                        else if (this._tool == "ROCK") {
                            console.log("DEL_ROC")
                        }
                        else if (this._tool == "WATER") {
                            console.log("DEL_WAT")
                        }
                        else if (this._tool == "PLANT") {
                            console.log("DEL_PLA")
                        }
                        else if (this._tool == "MUSHROOM") {
                            console.log("DEL_MUS")
                        }
                        else if (this._tool == "WALL") {
                            console.log("DEL_WAL")
                        }
                        else if (this._tool == "BLOCK") {
                            console.log("DEL_BLO")
                        }
                        else if (this._tool == "ACTOR") {
                            console.log("DEL_ACT")
                        }
                    }
                }
            }

        }.bind(this))
    },
    'public setActiveActor': function (actor_id) {
          this._activeActor = actor_id
    },
    'public loadGame': function (gametitle, gameid, spectate) {
        if (spectate === null) //Added optional param to set up as spectator -AP.
            spectate = false;

        this._gameID = gameid
        this._gameTitle = gametitle
        var renderer = this._renderer
        var cam = this._camPos

        if(spectate)
            this._is_hosting = false;
        else
            this.is_hosting = true;

        if(!spectate)
        {
            $.ajax({
                type: "get",
                url: "/game/"+gameid+"/?start=true",
                contentType:"application/json",
                statusCode: {
                    200: function(data)
                    {
                        console.log(data)
                    }
                }
            });
        }

        $.ajax({
            type: "get",
            url: "/game/"+gameid+"/?full_dump=true",
            contentType:"application/json",
            statusCode: {
                200: function(data)
                {
                    renderer.setWorldState(data)
                    renderer.updateView(cam)
                    this._currentTurn = data['current_turn'];

                    //Enable 'game' tab of side menu.
                    $("#side-game-menu-tab").removeClass("disabled");
                    $('#side-menu-tabs a[href="#side-game-menu"]').tab('show');

                    //Show game info.
                    $("#loaded-game-info").html(gametitle + ": " + this._currentTurn)
                }
            }
        })

        $("#advance-btn").click(
          function () {
              $.ajax({
                  type: "get",
                  url: "/game/"+gameid+"/?light_dump=true",
                  contentType:"application/json",
                  statusCode: {
                      200: function(data)
                      {
                          renderer.setWorldState(data)
                          renderer.updateView(cam)
                      }
                  }
              })

          })
        /*
        if(this._updateLoop != null)
            clearInterval(this._updateLoop)

        this._updateLoop = setInterval(function () {
            $.ajax({
                type: "get",
                url: "/game/"+gameid+"/?light_dump=true",
                contentType:"application/json",
                statusCode: {
                    200: function(data)
                    {
                        renderer.updateWorldState(data)
                    }
                }
            })

            renderer.updateView(this._camPos.x, this._camPos.y)
        }.bind(this), 5000)
        */
    },
    /*
    Initialize the simulation view and start the render loop. Update the viewable
    chunks in the scene as the camera is moved
    */
    'public startSimulationEngine': function() {
        var loader = this._renderer.loadAssets()
        var control = this

        loader.onFinish = function() {
            this._renderer.updateView(this._camPos)
//            this._renderer.renderSmellField(true)
            this._camPos = {x: 0, y: 0}

            this._renderEngine.runRenderLoop(function () {
                this._renderer.renderWorld()

                var camdist  = Math.abs(this._camPos.x - this._camera.target.x)
                    camdist += Math.abs(this._camPos.y - this._camera.target.z)

                if(camdist > 2) {
                    var newx = Math.floor(this._camera.target.x)
                    var newy = Math.floor(this._camera.target.z)
                    this._camPos = {x: newx, y: newy}
                    this._renderer.updateView(this._camPos)
                }
            }.bind(this))
        }.bind(this)

        loader.load()
    },
    /*
    Turn off smell field and close cell status window
    */
    'public setDefaultRenderSettings': function() {
        this._smellMode = false
        this._cellStatus = null
    },
    /*
    Turn the smell field on and off
    */
    'public setSmellMode': function(setting) {
        this._smellMode = setting
    },
    /*
    Open the cell status window for the cell at point (x,y)

    param x: cell x position
    param y: cell y position
    */
    'public getcellStatus': function(x,y) {
        return renderer.getCell(x,y)
    },
    /*
    Move the camera to the point (x,y) and update the scene.

    param x: view x position
    param y: view y position
    */
    'public moveCamera': function(x,y) {
        renderer.updateCam(x,y)
    },
    'public setUse': function (use) {
        console.log(use + " MODE")
        this._use = use
    },
    'public setTool': function (tool) {
        console.log(tool + " TOOL")
        this._tool = tool
    }
})
