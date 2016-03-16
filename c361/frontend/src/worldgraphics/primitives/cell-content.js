var Class = require("easejs").Class

module.exports = Class("WorldCell", {
    'private _type': null,
    'private _mesh': undefined,
    __construct: function(json_dump) {
        this._type = json_dump["type"]
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
        return {
            "type": this._type
        }
    }
})
