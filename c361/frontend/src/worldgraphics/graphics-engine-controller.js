var Class = require("easejs").Class
var WorldRenderer = require("./world-renderer")
//var TimelineFetcher = require("../networking/timeline-fetcher").new()
//var WorldStateFetcher = require("../networking/world-state-fetcher").new()

module.exports = Class("GraphicsEngineController", {
    'private _renderEngine': null,
    'private _camera': null,
    'private _camPos': null,
    'private _renderer': null,
    'private _smellMode': false,
    'private _timeLine': null,
    'private _turn': 0,
    'private _rtarget': null,
    'private _setupKeys': function(scene) {
        scene.actionManager = new BABYLON.ActionManager(scene)
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger,
            function (evt) {
                if(evt.sourceEvent.keyCode==16) {
                    this._camera.angularSensibilityX = 1000000000
                }
            }.bind(this)
        ))

        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger,
            function (evt) {
                if(evt.sourceEvent.keyCode==16) {
                    this._camera.angularSensibilityX = 1500
                }
            }.bind(this)
        ))
    },
    __construct: function(renderTarget) {
        var engine = new BABYLON.Engine(renderTarget, true)
        var scene  = new BABYLON.Scene(engine)

        var camera = new BABYLON.ArcRotateCamera("camera", Math.PI/8,Math.PI/8,45, new BABYLON.Vector3(0,0,0), scene)
        camera.upperRadiusLimit = 55
        camera.lowerRadiusLimit = 15
        camera.upperBetaLimit = Math.PI/8
        camera.lowerBetaLimit = Math.PI/8

        camera.keysUp = []
        camera.keysDown = []
        camera.keysLeft = []
        camera.keysRight = []

        camera.panningSensibility = 100
        camera.angularSensibilityX = 1500
        camera.wheelPrecision = 25
        camera.attachControl(renderTarget)

        var renderer = WorldRenderer(renderTarget, engine, camera, scene)

        this._renderEngine = engine
        this._camera = camera
        this._renderer = renderer

        this._setupKeys(scene)
        this.startSimulationEngine()
    },
    'public startSimulationEngine': function() {
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
    },
    'public setDefaultRenderSettings': function() {
        this._smellMode = false
        this._cellStatus = null
    },
    'public smellModeOn': function() {
        return this._smellMode
    },
    'public setSmellMode': function(setting) {
        this._smellMode = setting
    },
    'public getcellStatus': function(x,y) {
        return renderer.getCell(x,y)
    },
    'public moveCamera': function(x,y) {
        renderer.updateCam(x,y)
    },
})
