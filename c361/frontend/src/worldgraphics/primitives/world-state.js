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
    'private _dump': null,

    __construct: function(json_dump) {
        this._standardHeight = json_dump["standardHeight"]
        this._width          = json_dump["width"]
        this._length         = json_dump["length"]
        this._chunkSize      = json_dump["chunkSize"]
        this._waterThreshold = json_dump["waterThreshold"]
        this._rockThreshold  = json_dump["rockThreshold"]
        this._seed           = json_dump["seed"]
        this._seedsize       = json_dump["seedsize"]
        this._loadPatch(json_dump)
    },
    'private _loadPatch': function(json_dump){
        this._currentTurn    = json_dump["current_turn"]
        this._cells          = json_dump["cells"]
        this._dump           = json_dump
    },
    'public get': function(key) {
        return this["_" + key]
    },
    'private _patch_dicts': function(f_diff, t_diff, options) {
        patched = f_diff
        for(var k in t_diff){
            if(f_diff[k] == undefined)
                patched[k] = t_diff[k]
            else if (f_diff[k] !== null
                     && typeof f_diff[k] === 'object'
                     && t_diff[k] !== null
                     && typeof t_diff[k] === 'object')
            {
                if(options && options["reverse"] != undefined) {
                    patched[k] = this._patch_dicts(f_diff[k], t_diff[k], {
                        reverse: options["reverse"],
                        celldict: true
                    })
                }
                else {
                    patched[k] = this._patch_dicts(f_diff[k], t_diff[k])
                }
            }
            else {
                patched[k] = t_diff[k]
            }
        }

        if(options && options["reverse"] == true && options["celldict"] == true){
            for(k in f_diff) {
                if(t_diff[k] == undefined)
                    patched[k] = undefined
            }
        }

        return patched
    },
    'public patch': function (diffs, options) {
        patch_diffs = []
        if (options && options["reverse"] == true) {
            for(var k in diffs)
                patch_diffs.push(diffs[k]["pre"])
        }
        else {
            for(var k in diffs)
                patch_diffs.push(diffs[k]["post"])
        }

        var patchdct = function(f,t) {
            if(options && options["reverse"])
                return this._patch_dicts(f,t, {reverse: options["reverse"]})
            else
                return this._patch_dicts(f,t)
        }.bind(this)

        var patched = patch_diffs.reduce(patchdct, this._dump)
  
        this._loadPatch(patched)
        return patched
    },
    'public unpatch': function (diffs) {
        return this.patch(diffs, {reverse: true})
    },
    'public setCells': function(cells) {
        this._cells = cells
    }
})
