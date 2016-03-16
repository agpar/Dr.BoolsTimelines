var Class = require("easejs").Class
var WorldCell = require("./world-cell")

module.exports = Class("WorldState", {
    'private _standardHeight': null,
    'private _width': null,
    'private _length': null,
    'private _chunkSize': null,
    'private _waterThreshold': null,
    'private _rockThreshold': null,
    'private _seed': null,
    'private _seedSize': null,
    'private _cells': null,
    __construct: function(json_dump) {
        this._standardHeight = json_dump["standardHeight"]
        this._width          = json_dump["width"]
        this._length         = json_dump["length"]
        this._chunkSize      = json_dump["chunkSize"]
        this._waterThreshold = json_dump["waterThreshold"]
        this._rockThreshold  = json_dump["rockThreshold"]
        this._seed           = json_dump["seed"]
        this._seedSize       = json_dump["seedSize"]

        var cells = []
        for(cell in json_dump["cells"])
            cells.push(WorldCell(cell, this._cells))

        this._cells = cells
    },
    'public get': function(key) {
        return this["_" + key]
    },
    'public applyDeltas': function (deltas, backstep) {

    },
    'public getCell': function(x,y) {
        if(this._)
        return {

        }
    }
})
