var Class = require("easejs").Class
var lru = require("lru-cache")

var WorldState = require("./primitives/world-state")
var Cell = require("./primitives/world-cell")


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
    'private _proto': {
        'WATER': null,
        'ROCK':  null,
        'GRASS': null,
        'BLOCK': null,
        'MUSH':  null,
        'PLANT': null
    },
    /*
    Load the prototype mesh assets and return an event handle to be bound to
    a render loop initialtion function.
    */
    'public loadAssets': function() {
        var meta = document.querySelector("meta[name='mesh-dir']").getAttribute('content')
        var boletus_link = meta + "boletus_obj/"

        var loader = new BABYLON.AssetsManager(this._scene)
        /*

        var mushloader = loader.addMeshTask("MUSH", "", boletus_link, "boletus.obj")

        mushloader.onSuccess = function(t) {
            t.loadMeshes.forEach(function(m) {
                m.position = new BABYLON.Vector3(-10000,-10000,-10000)
                this._proto["MUSH"] = m
            }.bind(this))
        }.bind(this)
        */
        this._proto["MUSH"] = BABYLON.Mesh.CreateSphere("MUSH", 20, 1.0, this._scene)
        this._proto["MUSH"].position = new BABYLON.Vector3(-10000,-10000,-10000)
        return loader
    },
    __construct: function (renderTarget, engine, camera, scene) {
        //Configure the LRU cache holding the scene chunks.
        var options = {
            max: 100,
            dispose: function (key, chunk) {
                for (var row in chunk) {
                    cell = chunk[row].pop()
                    while (cell != undefined) {
                        for(c in cell.contents) {
                            if(c.mesh != undefined)
                                c.mesh.dispose()
                        }
                        if(cell.mesh != undefined)
                            cell.mesh.dispose()
                        cell = chunk[row].pop()
                    }
                }
            }
        }
        this._sceneChunks = lru(options)

        //  placeholder state
        var seed = []
        var seedsize = 600
        for (var i = 0; i < seedsize; i++){
            var row = []
            for (var j = 0; j < seedsize; j++){
                row.push(Math.random())
            }
            seed.push(row)
        }


        var key
        var cells = {}

        for (var i = -5; i <= 5; i++) {
            for(var j = -5; j <= 5; j++) {
                key = j + " " + i
                cells[key] = {
                    elevation: 10,
                    contents: [],
                    coords: {'x': j, 'y': i},
                    type: "GRASS",
                    mesh: undefined,
                }

                if(Math.random() < 0.1) {
                    cells[key].contents.push({
                        "type": "MUSH",
                        "health": 50,
                        "mesh": undefined
                    })
                }
            }
        }


        var tempstate = WorldState({
            "standardHeight": 15,
            "width": 100000,
            "length": 100000,
            "chunkSize": 6,
            "waterThreshold": 0.2,
            "rockThreshold": 0.175,
            "seed": seed,
            "seedSize": seedsize,
            "cells": cells
        })

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

        this._proto["WATER"] = water
        this._proto["ROCK"]  = rock
        this._proto["GRASS"] = grass

        this._scene = scene
    },
    /*
    Terrain generation function. Produces a cell either from the ones defined
    in the world's state or otherwise generated formulaically.

    param x: Cell x coordinate
    param y: Cell y coordinate

    out: Cell configuration data.
    */
    'private _terrainGen': function(x,y) {
        var cx = Math.floor(x)
        var cy = Math.floor(y)

        var val = 0
        var cell = this._worldState.get("cells")[cx + " " + cy]
        var tgen = this._computeCell(cx,cy)

        if(tgen == null)
            return null

        if(cell != undefined)
            return cell

        val = val + tgen.val*this._worldState.get("standardHeight")
        var tpe = "GRASS"

        if(tgen.val <= 0.2)
            tpe = "WATER"
        else if(tgen.grad > 0.175)
            tpe = "ROCK"

        if(val < 1)
          val = 1

        cell = {
            elevation: val + 1.0,
            contents: [],
            coords: {'x': x, 'y': y},
            type: tpe,
            mesh: undefined,
        }

        return cell
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
    Out.grad: Gradient magniute of the terrain field.
    */
    'private _computeCell': function (x,y) {
        var seed        = this._worldState.get("seed")
        var seedsize    = this._worldState.get("seedSize")
        var worldWidth  = this._worldState.get("width")
        var worldLength = this._worldState.get("length")
        var chunksize   = this._worldState.get("chunkSize")

        var cellx = Math.round(x + worldWidth/2)
        var celly = Math.round(y + worldLength/2)

        if(cellx < 0) return null
        if(celly < 0) return null
        if(cellx >= worldWidth) return null
        if(celly >= worldLength) return null

        var x0 = Math.floor(cellx/chunksize) % seedsize
        var x1 = (x0 + 1) % seedsize
        var dx = cellx/chunksize - x0

        var y0 = Math.floor(celly/chunksize) % seedsize
        var y1 = (y0 + 1) % seedsize
        var dy = celly/chunksize - y0

        var f0 = this._cosineInterp(seed[y0][x0], seed[y0][x1], dx)
        var f1 = this._cosineInterp(seed[y1][x0], seed[y1][x1], dx)


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
    'public setInspectionMode': function (mode) {
        this._inspect = mode;
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
        if(this._worldState.get("cells")[x + " " + y] != undefined)
            return this._worldState.get("cells")[x + " " + y]

        return this._terrainGen(x,y)
    },
    /*
    Update the chunks in the lru cache based on the position inputted.

    param x: x position of view.
    param y: y position of view.
    param force: Force update over already defined chunks in the view.
    */
    'public updateView': function(x,y, force) {
        var chunksize = this._worldState.get("chunkSize")

        var chunk_x
        var chunk_y

        for(var i = -4; i <= 4; i++) {
            for(var  j = -4; j <= 4; j++) {
                chunk_x = Math.floor(x/chunksize) + j
                chunk_y = Math.floor(y/chunksize) + i

                chunk_x *= chunksize
                chunk_y *= chunksize

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
        //Make sure to round key into chunk grid coordinates
        var chunksize = this._worldState.get("chunkSize")
        var chunk_x = Math.floor(x/chunksize)
        var chunk_y = Math.floor(y/chunksize)

        var cellx = chunk_x*chunksize
        var celly = chunk_y*chunksize

        if(!force && this._sceneChunks.get(chunk_x + " " + chunk_y) != undefined)
            return

        var chunk = []
        var cell, mesh, meshx, meshy, meshz

        for(var i = 0; i < chunksize; i++) {
            var row = []
            for(var j = 0; j < chunksize; j++) {
                cell = this._terrainGen(cellx, celly)

                if(cell == null)
                    continue

                meshx = chunk_x*chunksize + j
                meshz = chunk_y*chunksize + i
                meshy = cell["elevation"]/4

                mesh = this._proto[cell["type"]]
                           .createInstance(cellx + " " + celly)

                mesh.scaling.y = cell["elevation"]/2

                mesh.position = new BABYLON.Vector3(meshx, meshy, meshz)

                var cont
                for(k in cell.contents) {
                    cont = cell.contents[k]
                    cont.mesh = this._proto[cont["type"]]
                                    .createInstance(cellx + " " + celly + " " + cont["type"])
                    cont.mesh.position = new BABYLON.Vector3(meshx, cell["elevation"]/2, meshz)

                    cont.mesh.isPickable = false;
                }

                cell["mesh"] = mesh
                row.push(cell)
                cellx++
            }
            celly++
            cellx = chunk_x*chunksize
            chunk.push(row)
        }

        this._sceneChunks.set(chunk_x + " " + chunk_y, chunk)
    }
})
