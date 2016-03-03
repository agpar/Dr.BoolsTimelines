var Class = require("easejs").Class


module.exports = function(renderer){
    return (
        Class("GraphicsEngineController", {
            'private _mouseClick': false,
            'private _mousePos': {x: 0, y:0},
            'private _keysPressed': [],
            'private _smellMode': false,
            'private _timeLine': null,
            'private _turn': 0,
            'private _renderer': renderer,
            'public mergeRenderSettings': function(settings) {
                if(settings["mouseClick"])
                    this._mouseClick = settings["mouseClick"]

                if(settings["mousePos"])
                    this._mousepos = settings["mousePos"]

                if(settings["keysPressed"])
                    this._keysPressed = settings["keys"]

                if(settings["smellMode"])
                    this._smellMode = settings["smellMode"]

                if(settings["turn"])
                    this._turn = settings["turn"]
            },
            'public setDefaultRenderSettings': function() {
                this.mergeRenderSettings({
                    mouseClick: false,
                    mousePos: {x: 0, y: 0},
                    keysPressed: null,
                    smellMode: false,
                    turn: 0
                })
            },
            'public getSettings': function() {
                return {
                    mouseClick: this._mouseClick,
                    mousePos: this._mousePos,
                    keysPressed: this._keysPressed,
                    smellMode: this._smellMode,
                    timeLine: this._timeLine,
                    turn: this._turn
                }
            },
            'public toggleSmellMode': function() {
                this._smellMode = !this._smellMode
            },
            'public toggleCellStatus': function(x,y) {
                this._smellMode = !this._smellMode
            },
            'public renderWorld': function() {

            }
        })
    )
}
