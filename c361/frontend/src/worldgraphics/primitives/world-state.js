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
    'private _marked': [],
    'private _title': undefined,
    'private _updatechunk': null,

    __construct: function(json_dump, title, update_chunk_hook) {
        this._title          = title
        this._updatechunk    = update_chunk_hook
        this._dump           = JSON.parse(JSON.stringify(json_dump))
        this._standardHeight = json_dump["standardHeight"]
        this._width          = json_dump["width"]
        this._length         = json_dump["length"]
        this._chunkSize      = json_dump["chunkSize"]
        this._waterThreshold = json_dump["waterThreshold"]
        this._rockThreshold  = json_dump["rockThreshold"]
        this._seed           = json_dump["seed"]
        this._seedsize       = json_dump["seedsize"]
        this._currentTurn    = json_dump["current_turn"]
        this._cells          = json_dump["cells"]
        $("#loaded-game-info").html("<b>Game: </b>" + this._title + "<br><b>Turn</b> " + this._currentTurn)
    },
    'private _loadPatch': function(json_dump){
        this._dump = JSON.parse(JSON.stringify(json_dump))
        this._currentTurn    = json_dump["current_turn"]
        this._cells          = json_dump["cells"]
        $("#loaded-game-info").html("<b>Game: </b>" + this._title + "<br><b>Turn</b> " + this._currentTurn)
    },
    'public get': function(key) {
        return this["_" + key]
    },
    'private _patch_dicts': function(fr_diff, to_diff, options) {
        var turn_difference = fr_diff["current_turn"] - to_diff["current_turn"]
        var f_diff = JSON.parse(JSON.stringify(fr_diff))
        if(turn_difference * turn_difference > 1) return f_diff
        var patched = JSON.parse(JSON.stringify(f_diff))
        var t_diff = JSON.parse(JSON.stringify(to_diff))



        for(var k in t_diff) {
            if(f_diff[k] == undefined){
                patched[k] = t_diff[k]
            }
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

        for(k in f_diff) {
            if(k == "cells")
                continue

            if(t_diff[k] == undefined) {
                var cell = this._cells[k]
                if(cell && cell.contents) {
                    for(cont in cell.contents){
                        var ct = cell.contents[cont]
                        if(ct.mesh != undefined){
                            ct.mesh.dispose()
                        }
                    }

                  if(cell.mesh != undefined)
                      cell.mesh.dispose()
                }
                patched[k] = undefined
            }
        }

        return patched
    },
    'public patch': function (diffs, options) {
        var patch_diffs = []
        if (options && options["reverse"] == true) {
            for(var k in diffs)
                patch_diffs.push(JSON.parse(JSON.stringify(diffs[k]["pre"])))
        }
        else {
            for(var k in diffs)
                patch_diffs.push(JSON.parse(JSON.stringify(diffs[k]["post"])))
        }

        var patchdct = function(f,t) {
            if(options && options["reverse"])
                return this._patch_dicts(f,t, {reverse: options["reverse"]})
            else
                return this._patch_dicts(f,t)
        }.bind(this)

        var patched = patch_diffs.reduce(patchdct, this._dump)

        for(c in patched["cells"])
            this._marked.push(c)
        for(c in this._cells)
            this._marked.push(c)

        this._loadPatch(JSON.parse(JSON.stringify(patched)))
        var chunks = {}
        for(c in this._marked) {
            var s = this._marked[c].split(" ")
            var sp = {
              'x': Math.floor(Number(s[0])/this._chunkSize),
              'y': Math.floor(Number(s[1])/this._chunkSize)
            }
            var clab = sp.x + " " + sp.y
            if(!chunks[clab]) {
                chunks[clab] = true
                this._updatechunk(sp.x, sp.y, true)
            }
        }
        this._marked = []

        return patched
    },
    'public unpatch': function (diffs) {
        return this.patch(diffs, {reverse: true})
    },
    'public setCells': function(cells) {
        this._cells = cells
    },
    'public isMarked': function(coord){
        return this._marked.indexOf(coord.x + " " + coord.y) > -1
    },
    'public unMark': function(coord){
        if(this.isMarked(coord))
            this._marked.splice(this._marked.indexOf(coord.x + " " + coord.y), 1)
    }
})
