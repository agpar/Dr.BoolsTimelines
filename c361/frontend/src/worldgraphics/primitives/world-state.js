var Class = require("easejs").Class
var WorldCell = require("./world-cell")

module.exports = Class("WorldState", {
    'private _currentTurn': null,
    'private _standardHeight': null,
    'private _width': null,
    'private _length': null,
    'private _chunkSize': null,
    'private _waterThreshold': null,
    'private _rockThreshold': null,
    'private _seed': null,
    'private _seedsize': null,
    'private _cells': null,
    __construct: function(json_dump) {
        this._currentTurn    = json_dump["current_turn"]
        this._standardHeight = json_dump["standardHeight"]
        this._width          = json_dump["width"]
        this._length         = json_dump["length"]
        this._chunkSize      = json_dump["chunkSize"]
        this._waterThreshold = json_dump["waterThreshold"]
        this._rockThreshold  = json_dump["rockThreshold"]
        this._seed           = json_dump["seed"]
        this._seedsize       = json_dump["seedsize"]
        this._cells          = json_dump["cells"]

    },
    'public get': function(key) {
        return this["_" + key]
    },
    'private patch_dicts': function(f_diff, t_diff, options) {
        patched = f_diff
    },
    'public patch': function (diffs, options) {
        patch_diffs = []
        if (options["reverse"]) {
          patch_diffs = null
        }

    },
    'public unpatch': function (diffs) {

    },
    'public setCells': function(cells) {
        this._cells = cells
    }
})
