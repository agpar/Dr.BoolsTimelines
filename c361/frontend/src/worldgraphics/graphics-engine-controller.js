var Class = require("easejs").Class
var WorldRenderer = require("./world-renderer")
//var TimelineFetcher = require("../networking/timeline-fetcher").new()
//var WorldStateFetcher = require("../networking/world-state-fetcher").new()

module.exports = Class("GraphicsEngineController", {
    'private _camera': {x: 0, y: 0},
    'private _smellMode': false,
    'private _timeLine': null,
    'private _turn': 0,
    'private _renderer': null,
    'private _rtarget': null,
    __construct: function(renderTarget) {
        var renderer = WorldRenderer(renderTarget)
        renderer.updateCam(0,0,true)
        renderer.renderWorld()
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
    'public cameraPos': function() {
        return this._camera
    },
    'public moveCamera': function(x,y) {
        renderer.updateCam(x,y)
    },
})
