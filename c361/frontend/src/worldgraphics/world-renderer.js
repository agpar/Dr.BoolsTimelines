var Class = require("easejs").Class
var lru = require("lru-cache")


module.exports =  Class("WorldRenderer", {
    'private _scene': null,
    'private _sceneChunks': null,
    'private _worldState': null,
    'private _cellproto': {
        'water': null,
        'rock':  null,
        'grass': null
    },
    __construct: function (renderTarget, engine, camera, scene) {
        var options = {
            max: 400,
            dispose: function (key, chunk) {
                for (var row in chunk) {
                    cell = chunk[row].pop()
                    while (cell != undefined) {
                        cell.mesh.dispose()
                        cell = chunk[row].pop()
                    }
                }

            }
        }
        this._sceneChunks = lru(options)

    //  placeholder state
        var width  = 120000
        var length = 120000
        var chunkSize = 6

        var seed = []

        for (var i = 0; i < Math.ceil(600); i++){
            var row = []
            for (var j = 0; j < Math.ceil(600); j++){
                row.push(Math.random())
            }
            seed.push(row)
        }

        var tempstate = {
            'chunkSize': chunkSize,
            'wwidth': width,
            'wlength': length,
            'seed': {
                'mwidth': Math.ceil(600),
                'mlength': Math.ceil(600),
                'matrix': seed
            },
            'user_made': {}
        }

        this._worldState = tempstate
    //  end placeholder state
        var light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(0.1,-1,0.1), scene)

        var water = BABYLON.Mesh.CreateBox("water", 1.0, scene)
        var rock  = BABYLON.Mesh.CreateBox( "rock", 1.0, scene)
        var grass = BABYLON.Mesh.CreateBox("grass", 1.0, scene)

        var watermat = new BABYLON.StandardMaterial("watermat", scene)
        var rockmat  = new BABYLON.StandardMaterial( "rockmat", scene)
        var grassmat = new BABYLON.StandardMaterial("grassmat", scene)

        water.material = watermat
        rock.material  = rockmat
        grass.material = grassmat

        watermat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        rockmat.specularColor  = new BABYLON.Color3(0.0, 0.0, 0.0)
        grassmat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)

        watermat.diffuseColor = new BABYLON.Color3(0.0, 0.8, 1.0)
        rockmat.diffuseColor  = new BABYLON.Color3(0.3, 0.3, 0.3)
        grassmat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.0)


        water.position = new BABYLON.Vector3(-10000,-10000,-10000);
        rock.position  = new BABYLON.Vector3(-10000,-10000,-10000);
        grass.position = new BABYLON.Vector3(-10000,-10000,-10000);

        this._cellproto["water"] = water
        this._cellproto["rock"]  = rock
        this._cellproto["grass"] = grass

        this._scene = scene

    },
    'private _cosineInterp': function(v0, v1, t) {
        var phase = (1-Math.cos(t*Math.PI))/2
        var dphase = Math.sin(t*Math.PI)
        return {
            val: v0*(1-phase) + v1*phase,
            slope: -v0*dphase + v1*dphase,
        }
    },
    'private _computeCell': function (x,y) {
        var seed = this._worldState.seed
        var worldWidth = this._worldState.wwidth*this._worldState.chunkSize
        var worldLength = this._worldState.wlength*this._worldState.chunkSize

        var cellx = Math.round(x + worldWidth/2)
        var celly = Math.round(y + worldLength/2)

        if(cellx < 0) return null
        if(celly < 0) return null
        if(cellx >= worldWidth) return null
        if(celly >= worldLength) return null

        var x0 = Math.floor(cellx/this._worldState.chunkSize) % seed.mwidth
        var x1 = (x0 + 1) % seed.mwidth
        var dx = cellx/this._worldState.chunkSize - x0

        var y0 = Math.floor(celly/this._worldState.chunkSize) % seed.mlength
        var y1 = (y0 + 1) % seed.mlength
        var dy = celly/this._worldState.chunkSize - y0

        var f0 = this._cosineInterp(seed.matrix[y0][x0], seed.matrix[y0][x1], dx)
        var f1 = this._cosineInterp(seed.matrix[y1][x0], seed.matrix[y1][x1], dx)


        var fout = this._cosineInterp(f0.val, f1.val, dy)
        var xslope = this._cosineInterp(f0.slope, f1.slope, dy)

        var gradient  = Math.pow(xslope.val, 2)
            gradient += Math.pow(fout.slope, 2)
            gradient  = Math.sqrt(gradient)

        return {
            val: fout.val,
            grad: gradient
        }
    },
    'private _terrainGen': function (x,y) {
        var calc = this._computeCell(x,y)
        var cell = {cellHeight: calc.val*15 + 1.0}

        if(calc.val <= 0.15)
            cell["type"] = "water"
        else if(calc.grad > 0.35)
            cell["type"] = "rock"
        else
            cell["type"] = "grass"

        return cell
    },
    'public renderWorld': function() {
        this._scene.render()
    },
    'public setWorldState': function (state) {
        this._worldState = state
    },
    'public applyDeltas': function (deltas,backstep) {
        if (backstep) {
            for (delta in deltas) {

            }
        } else {
            for (delta in deltas) {

            }
        }

    },
    'public getCell': function (x,y) {
        return
    },
    'public updateView': function(x,y, force) {
        var chunk_x
        var chunk_y

        for(var i = -4; i <= 4; i++) {
            for(var  j = -4; j <= 4; j++) {
                chunk_x = Math.floor(x/this._worldState.chunkSize) + j
                chunk_y = Math.floor(y/this._worldState.chunkSize) + i

                chunk_x *= this._worldState.chunkSize
                chunk_y *= this._worldState.chunkSize

                this.updateChunk(chunk_x, chunk_y, force)
            }
        }
    },
    'public updateChunk': function (x,y, force) {
        //Make sure to force key into chunk grid coordinates
        var chunk_x = Math.floor(x/this._worldState.chunkSize)
        var chunk_y = Math.floor(y/this._worldState.chunkSize)

        var cellx = chunk_x*this._worldState.chunkSize
        var celly = chunk_y*this._worldState.chunkSize

        if(!force && this._sceneChunks.get(chunk_x + " " + chunk_y) != undefined)
            return

        var chunk = []
        var cell, mesh, meshx, meshy, meshz

        for(var i = 0; i < this._worldState.chunkSize; i++) {
            var row = []
            for(var j = 0; j < this._worldState.chunkSize; j++) {
                cell = this._terrainGen(cellx, celly)

                if(cell == null)
                    continue

                meshx  = chunk_x*this._worldState.chunkSize + j
                meshz  = chunk_y*this._worldState.chunkSize + i
                meshy  = cell.cellHeight/4

                mesh = this._cellproto[cell["type"]]
                           .createInstance(cellx + " " + celly)

                mesh.scaling.y = cell.cellHeight/2

                mesh.position = new BABYLON.Vector3(meshx, meshy, meshz)
                cell["mesh"] = mesh
                row.push(cell)
                cellx++
            }
            celly++
            cellx = chunk_x*this._worldState.chunkSize
            chunk.push(row)
        }

        this._sceneChunks.set(chunk_x + " " + chunk_y, chunk)
    }
})
