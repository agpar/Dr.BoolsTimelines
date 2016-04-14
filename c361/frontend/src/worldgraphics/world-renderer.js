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
    'private SMELL_SPREAD': 30,
    'private SMELL_RAD': 0.3,
    'private SMELL_CULL': Math.log(1/Math.pow(this.SMELL_RAD, this.SMELL_SPREAD)),
    'private _scene': null,
    'private _sceneChunks': null,
    'private _worldState': null,
    'private _proto': {
        'WATER': null,
        'ROCK':  null,
        'GRASS': null,
        'MUSH':  null,
        'ACTOR': null,
        'BLOCK': null,
        'PLANT': null
    },
    'private _smells': {},
    'private _smells_proto': {
        'MUSH':  null,
        'ACTOR': null,
        'PLANT': null
    },
    /*
    Load the prototype mesh assets and return an event handle to be bound to
    a render loop initialtion function.
    */
    'public loadAssets': function() {
        var particle_file = "static/image/particle.png"

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

        // Geometry
        this._proto["MUSH"] = BABYLON.Mesh.CreateSphere("MUSH", 20, 1.0, this._scene)
        this._proto["MUSH"].position = new BABYLON.Vector3(-10000,-10000,-10000)

        this._proto["ACTOR"] = BABYLON.MeshBuilder.CreateCylinder("ACTOR", {diameterTop: 0, tessellation: 10, height: 1}, this._scene);
        this._proto["ACTOR"].position = new BABYLON.Vector3(-10000,-10000,-10000)
        this._proto["ACTOR"].rotation.x = Math.PI/2.0

        var actormat = new BABYLON.StandardMaterial("actormat", this._scene)

        this._proto["ACTOR"].material = actormat

        actormat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        actormat.diffuseColor = new BABYLON.Color3(0.7, 0.3, 0.3)

        this._proto["BLOCK"] = BABYLON.Mesh.CreateBox("BLOCK", 1.0, this._scene)
        this._proto["BLOCK"].position = new BABYLON.Vector3(-10000,-10000,-10000)
        this._proto["BLOCK"].scaling.y = 2.0
        this._proto["BLOCK"].scaling.x = 0.95
        this._proto["BLOCK"].scaling.z = 0.95

        var blockmat = new BABYLON.StandardMaterial("blockmat", this._scene)

        this._proto["BLOCK"].material = blockmat

        blockmat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        blockmat.diffuseColor = new BABYLON.Color3(0.45, 0.3, 0.15)

        this._proto["PLANT"] = BABYLON.MeshBuilder.CreateCylinder("ACTOR", {diameterTop: 1, diameterBottom: 0.01, tessellation: 6, height: 3}, this._scene);
        this._proto["PLANT"].position = new BABYLON.Vector3(-10000,-10000,-10000)

        var plantmat = new BABYLON.StandardMaterial("plantmat", this._scene)

        this._proto["PLANT"].material = plantmat

        plantmat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        plantmat.diffuseColor = new BABYLON.Color3(0.0, 0.3, 0.0)

        //Smell particles
        var base_smell = new BABYLON.ParticleSystem("particles", 2000, this._scene)
        base_smell.particleTexture = new BABYLON.Texture(particle_file, this._scene)

        // Where the particles come from
        base_smell.minEmitBox = new BABYLON.Vector3(-1, 0, 0) // Starting all from
        base_smell.maxEmitBox = new BABYLON.Vector3(1, 0, 0) // To...

        // Size of each particle (random between...
        base_smell.minSize = 0.1
        base_smell.maxSize = 0.5

        // Life time of each particle (random between...
        base_smell.minLifeTime = 0.1
        base_smell.maxLifeTime = 0.5

        // Emission rate
        base_smell.emitRate = 1500

        // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
        base_smell.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE

        // Set the gravity of all particles
        base_smell.gravity = new BABYLON.Vector3(0, 0.5, 0)

        // Direction of each particle after it has been emitted
        base_smell.direction1 = new BABYLON.Vector3(-5, -5, -5)
        base_smell.direction2 = new BABYLON.Vector3(5, 5, 5)

        // Angular speed, in radians
        base_smell.minAngularSpeed = 0
        base_smell.maxAngularSpeed = Math.PI

        // Speed
        base_smell.minEmitPower = 0.5
        base_smell.maxEmitPower = 1
        base_smell.updateSpeed = 0.005
        this._smells_proto["MUSH"] = base_smell.clone("MUSH-particles")
        this._smells_proto["MUSH"].emitter = this._proto["MUSH"]
        this._smells_proto["ACTOR"] = base_smell.clone("ACTOR-particles")
        this._smells_proto["ACTOR"].emitter = this._proto["ACTOR"]

        this._smells_proto["ACTOR"].color1 = new BABYLON.Color4(0.7, 0.3, 0.3, 1.0)
        this._smells_proto["ACTOR"].color2 = new BABYLON.Color4(0.7, 0.3, 0.3, 0.5)

        this._smells_proto["PLANT"] = base_smell.clone("PLANT-particles")
        this._smells_proto["PLANT"].emitter = this._proto["PLANT"]

        this._smells_proto["PLANT"].color1 = new BABYLON.Color3(0.0, 0.3, 1.0)
        this._smells_proto["PLANT"].color2 = new BABYLON.Color3(0.0, 0.3, 0.5)



        return loader
    },
    __construct: function (renderTarget, engine, camera, scene) {
        //Configure the LRU cache holding the scene chunks.
        var renderer = this
        var options = {
            max: 100,
            dispose: function (key, chunk) {
                for (var row in chunk) {
                    cell = chunk[row].pop()
                    while (cell != undefined) {
                        renderer.clearContents(cell.contents)
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
                    mesh: undefined
                }

                if(Math.random() < 0.1) {
                    cells[key].contents.push({
                        "type": "PLANT",
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
            "seedsize": seedsize,
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
    'public pickCell': function (x,y) {
        return this._scene.pick(x,y)
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
        var seedsize    = this._worldState.get("seedsize")
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
    'public setWorldState': function (state, title) {
        var tstate = state
        if(tstate["seed"] == undefined)
            tstate["seed"] = this._worldState.get("seed")
        this._worldState = WorldState(tstate, title, this.updateChunk.bind(this), this.clearContents.bind(this))
        this._sceneChunks.reset()
    },
    'public getStateProp': function (key) {
        return this._worldState.get(key)
    },
    'public patch': function (diffs) {
        this._worldState.patch(diffs)
    },
    'public unpatch': function (diffs) {
        this._worldState.unpatch(diffs)
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
    'public updateView': function(cam) {
        var x = cam.x
        var y = cam.y
        if(this._worldState == null)
            return

        var chunksize = this._worldState.get("chunkSize")

        var chunk_x
        var chunk_y


        for(var i = -4; i <= 4; i++) {
            for(var  j = -4; j <= 4; j++) {
                chunk_x = Math.floor(x/chunksize) + j
                chunk_y = Math.floor(y/chunksize) + i

                chunk_x *= chunksize
                chunk_y *= chunksize

                this.updateChunk(chunk_x, chunk_y)
            }
        }
    },
    'public initSmell': function(cont) {
        if(this._smells_proto[cont.type] == undefined || cell.mesh == undefined)
            return
        cont.smell_name = cell.coords.x + " " + cell.coords.y + "--smell--" + type
        cont.smell = this._smells_proto[type].clone(cont.smell_name)
        cont.smell.emitter = cont.mesh
        this._smells[cont.smell_name] = cont.smell
    },
    'public showSmells': function () {
        for(var s in this._smells){
            var smell = this._smells[s]
            smell.start()
        }
    },
    'public hideSmells': function () {
        for(var s in this._smells){
            var smell = this._smells[s]
            smell.stop()
        }
    },
    'public clearContents': function (contents) {
        if(contents != undefined) {
            for(c in contents) {
                var cont = contents[c]
                this._smells[cont.smell_name] = undefined
                if(cont.smell != undefined)
                    cont.smell.dispose()
                if(cont.mesh != undefined)
                    cont.mesh.dispose()
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
    'public updateChunk': function (x,y, force, chunk_coords) {
        //Make sure to round key into chunk grid coordinates
        var chunksize = this._worldState.get("chunkSize")
        var chunk_x = Math.floor(x/chunksize)
        var chunk_y = Math.floor(y/chunksize)
        if(chunk_coords){
            chunk_x = x
            chunk_y = y
        }

        var cellx = chunk_x*chunksize
        var celly = chunk_y*chunksize

        var cell, mesh, smell, row
        var chunk = []

        if(!force && this._sceneChunks.get(chunk_x + " " + chunk_y))
            return

        for (var i = 0; i < chunksize; i++) {
            row = []
            for (var j = 0; j < chunksize; j++) {
                cell = JSON.parse(JSON.stringify(this._terrainGen(cellx, celly)))

                mesh = this._proto[cell["type"]]
                           .createInstance(cellx + " " + celly)

                mesh.scaling.y = cell["elevation"]/2

                mesh.position = new BABYLON.Vector3(cellx, cell["elevation"]/4, celly)
                cell["mesh"] = mesh

                for(k in cell.contents) {
                    var cont = cell.contents[k]
                    cont.mesh = this._proto[cont["type"]]
                                    .createInstance(cellx + " " + celly)
                    cont.mesh.position = new BABYLON.Vector3(cellx, cell["elevation"]/2, celly)
                    switch(cont.direction) {
                        case "WEST":
                            cont.mesh.rotation.z = Math.PI/2
                            break
                        case "SOUTH":
                            cont.mesh.rotation.z = Math.PI
                            break
                        case "EAST":
                            cont.mesh.rotation.z = 3*Math.PI/2
                            break
                        default:
                            cont.mesh.rotation.z = 0
                            break
                    }
                    cont.mesh.isPickable = false
                    this.initSmell(cell, cont["type"])
                }

                row.push(cell)
                cellx++
            }
            chunk.push(row)
            cellx = chunk_x*chunksize
            celly++
        }
        this._sceneChunks.set(chunk_x + " " + chunk_y, chunk)
    }
})
