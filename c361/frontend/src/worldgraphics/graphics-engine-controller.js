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
    'private _renderEngine': null,
    'private _camera': null,
    'private _camPos': null,
    'private _renderer': null,
    'private _smellMode': false,
    'private _timeLine': null,
    'private _turn': 0,
    'private _rtarget': null,
    'private _tool': "INSPECT",
    'private _use': "CAMERA",

    'private _popupStats': function (stats) {
        $('#cell-stats').show()

        $("div#cell-stats span#elevation").html(Math.round(100*stats.elevation)/100 + " meters");
        $("div#cell-stats span#cell-type").html(stats.type);
        $("div#cell-stats span#coords").html(stats.coords);
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
        this._renderer = renderer

        this._setupKeys(scene)
        this.startSimulationEngine()

        $("#simulation-render-target").click(function(evt){
            if (this._tool == "CAMERA") {
                this._camera.angularSensibilityX = 1500
                this._camera.angularSensibilityY = 1500
            }
            else if(this._tool == "INSPECT") {
                    var picked = scene.pick(evt.clientX, evt.clientY)
                    var coords = picked.pickedMesh.name.split(" ").map(function(x){return Number(x)})
                    
                    stats = this._renderer.getCell(coords[0], coords[1])
                    console.log(stats)
                    this._popupStats(stats)
            } 
            else {
                if(this._use == "ADD") {
                
                }  
            }
            
        }.bind(this))
    },
    /*
    Initialize the simulation view and start the render loop. Update the viewable
    chunks in the scene as the camera is moved
    */
    'public startSimulationEngine': function() {
        var loader = this._renderer.loadAssets()
        var control = this

        loader.onFinish = function() {
            this._renderer.updateView(0,0,true)
            this._camPos = {x: 0, y: 0}

            this._renderEngine.runRenderLoop(function () {
                this._renderer.renderWorld()

                var camdist  = Math.abs(this._camPos.x - this._camera.target.x)
                    camdist += Math.abs(this._camPos.y - this._camera.target.z)

                if(camdist > 2) {
                    var newx = Math.floor(this._camera.target.x)
                    var newy = Math.floor(this._camera.target.z)
                    this._renderer.updateView(newx, newy, false)
                    this._camPos = {x: newx, y: newy}
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
})
