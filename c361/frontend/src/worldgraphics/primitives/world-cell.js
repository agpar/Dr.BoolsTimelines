var Class = require("easejs").Class
var CellContent = require("./cell-content")


module.exports = Class("WorldCell", {
    'private _contents': null,
    'private _type': null,
    'private _elevation': null,
    'private _coords': {'x': 0, 'y': 0},
    'private _mesh': undefined,
    __construct: function(json_dump, cellHeight_ref) {
        var contents = []
        for (content in json_dump["contents"])
            contents.push(CellContent(content))

        this._contents  = contents
        this.type       = json_dump["type"]
        this._elevation = json_dump["elevation"]
        this._coords    = json_dump["coords"]
    },
    'public get': function(key) {
        return this["_" + key]
    },
    'public applyDeltas': function (deltas, backstep) {

    },
    'public setMesh': function(mesh) {
        this._mesh = mesh
    },
    'public dispose': function() {
        if(this._mesh != undefined)
            this._mesh.dispose()
    },
    'public getStats': function() {
        var content_stats = []
        for(content in this._contents)
            this.content_stats.push(content.getStats())

        return {
            "contents": content_stats,
            "type": this._type,
            "height": this._height,
            "coords": {'x': this._coords["x"], 'y': this._coords["y"]}
        }
    }
})
