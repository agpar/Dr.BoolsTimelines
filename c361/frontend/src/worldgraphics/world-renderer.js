var Class = require("easejs").Class
var lru = require("lru-cache")

/*
World Renderer class contains the core functionality for
rendering the simulation. It recieves State and changes
from the graphics controller and updates the 3D view accordingly.
An LRU cache is used to store the cells in the view. This reduces the risk
of an unbounded growth of rendered chunks in the world.

param renderTarget: DOM element containing the canvas that will be rendered to.
param engine: An instance of the BABYLON.Engine class.
param camera: The BABYLON.Camera instance which the user views through
param scene: The BABYLON.Scene instance displaying the cells stored in loaded chunks.
*/
module.exports =  Class("WorldRenderer", {
    'private _scene': null,
    'private _sceneChunks': null,
    'private _worldState': null,
    'private _cellproto': {
        'WATER': null,
        'ROCK':  null,
        'GRASS': null
    },
    __construct: function (renderTarget, engine, camera, scene) {
        //Configure the LRU cache holding the scene chunks.
        var options = {
            max: 100,
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

        for (var i = 0; i < 600; i++){
            var row = []
            for (var j = 0; j < 600; j++){
                row.push(Math.random())
            }
            seed.push(row)
        }

        var cells = {}
        for (var i = -5; i <= 5; i++) {
          for(var j = -5; j <= 5; j++) {
            cells[j + " " + i] = {"elevation": 30}
          }
        }
        var tempstate = {
            'standardHeight': 15,
            'chunkSize': chunkSize,
            'wwidth': width,
            'wlength': length,
            'seed': {
                'mwidth': Math.ceil(600),
                'mlength': Math.ceil(600),
                'matrix': seed
            },
            'cells': cells
        }

        this._worldState = tempstate
        //  end placeholder state

        //Basic condiguration for the render engine.
        var light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(0.1,-1,0.1), scene)

        //Define cell block prototypes
        var water = BABYLON.Mesh.CreateBox("WATER", 1.0, scene)
        var rock  = BABYLON.Mesh.CreateBox( "ROCK", 1.0, scene)
        var grass = BABYLON.Mesh.CreateBox("GRASS", 1.0, scene)

        //Define materials for each cell type
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

        //Place prototype meshes out of sight.
        water.position = new BABYLON.Vector3(-10000,-10000,-10000)
        rock.position  = new BABYLON.Vector3(-10000,-10000,-10000)
        grass.position = new BABYLON.Vector3(-10000,-10000,-10000)

        this._cellproto["WATER"] = water
        this._cellproto["ROCK"]  = rock
        this._cellproto["GRASS"] = grass

        this._scene = scene
    },
    /*
    Terrain generation function. Produces a cell either from the ones defined
    in the world's state or otherwise generated formulaically.

    param x: Cell x coordinate
    param y: Cell y coordinate

    out: Configured WorldCell object.
    */
    'private _terrainGen': function (x,y) {
        var calc = this._userTerrain(x,y)
        var cell = {cellHeight: calc.val + 1.0}

        if(calc.val <= 0.2*this._worldState.standardHeight)
            cell["type"] = "WATER"
        else if(calc.grad > 0.175)
            cell["type"] = "ROCK"
        else
            cell["type"] = "GRASS"

        return cell
    },
    /*
    Compute the generated cell and apply the user made changes offsetting the
    field.

    param x: x position for cell
    param y: y position for cell

    Out.val: Height of the cell.
    Out.grad: Magnitude of the gradient at the cell position.
    */
    'private _userTerrain': function(x,y) {
        var cx = Math.floor(x)
        var cy = Math.floor(y)
        var tgen = this._computeCell(cx,cy)

        var val = -Number.MAX_VALUE //output height
        var p_val = val //previous value
        var xgrad = 0
        var ygrad = 0
        var h
        var otx //x offset
        var oty //y offset
        var split
        for (cell in this._worldState.cells){
            split = cell.split(" ")

            otx = cx - Number(split[0])
            oty = cy - Number(split[1])


            h = this._worldState.cells[cell]["elevation"]
            abs_h = Math.abs(h) + 0.0001

            if(otx*otx + oty*oty > 2*abs_h)
                continue

            p_val = val

            val = Math.max(val, h*Math.exp(-(otx*otx + oty*oty)/abs_h))
            if (val != p_val) {
                xgrad = -otx*Math.exp(-(otx*otx + oty*oty)/abs_h)/6
                ygrad = -oty*Math.exp(-(otx*otx + oty*oty)/abs_h)/6
            }
        }

        val = val + tgen.val*this._worldState.standardHeight

        var grad  = xgrad*xgrad
            grad += ygrad*ygrad
            grad += tgen.grad["x"]*tgen.grad["x"]
            grad += tgen.grad["y"]*tgen.grad["y"]

        grad = Math.sqrt(grad)

        if (val == -Number.MAX_VALUE) {
            return {
                'val': tgen.val*this._worldState.standardHeight,
                'grad': Math.sqrt(tgen.grad["x"]*tgen.grad["x"] + tgen.grad["y"]*tgen.grad["y"])
            }
        }

        if(val < 1) {
          val = 1
          grad = 0
        }

        return {
          'val': val,
          'grad': grad
        }
    },
    /*
    Cosine interpolation used for smoooth terrain map generation.

    param v0: Inital value
    param v1: Final value
    param t: Amount between 0 and 1 from inital value to final value.

    Out.val: Interpolated value
    Out.slope: Derivative of interpolation
    */
    'private _cosineInterp': function(v0, v1, t) {
        var phase = (1-Math.cos(t*Math.PI))/2.0
        var dphase = Math.sin(t*Math.PI)/2.0
        return {
            val: v0*(1-phase) + v1*phase,
            slope: -v0*dphase + v1*dphase,
        }
    },
    /*
    Core terrain map generation by interpolating between points in a randomly
    generated matrix.

    param x: Cell x coordinate
    param y: Cell y coordinate

    Out.val: Height of the cell between 0 and 1.
    Out.grad: Gradient of the terrain field.
    */
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
            grad: {'x': xslope.val, 'y': fout.slope}
        }
    },
    /*
    Render the geometry in the scene.
    */
    'public renderWorld': function() {
        this._scene.render()
    },
    /*
    Set the entire state of the world to the new state.

    param state: The new state to replace the state of the world.
    */
    'public setWorldState': function (state) {
        this._worldState = state
    },
    /*
    Update the world with the changes specified by a list of state change
    operations.

    param deltas: List of state change operations.
    param backstep: If true then the operations will be applied backwards.
    */
    'public applyDeltas': function (deltas, backstep) {
        if (backstep) {
            for (delta in deltas) {

            }
        } else {
            for (delta in deltas) {

            }
        }

    },
    /*
    Return the cell information at the inputted grid position.

    param x: x coordinate of cell
    param y: y coordinate of cell

    out: Cell object at point (x,y)
    */
    'public getCell': function (x,y) {
        if(this._worldState.cells[x + " " + y] != undefined)
            return this._worldState.cells[x + " " + y]

        return this._terrainGen(x,y)
    },
    /*
    Update the chunks in the lru cache based on the position inputted.

    param x: x position of view.
    param y: y position of view.
    param force: Force update over already defined chunks in the view.
    */
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
    /*
    Update a single chunk into the lru cache by either looking up the chunk in the world state
    or otherwise generating it formulaically.

    param x: x position of chunk
    param y: y position of chunk
    param force: Force update the chunk even if it's already loaded.
    */
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
