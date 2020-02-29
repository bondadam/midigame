window.midiGame = new function() {

    this.canvas = document.getElementById("renderCanvas"); // Get the canvas element 
    this.engine = new BABYLON.Engine(this.canvas, true); // Generate the BABYLON 3D engine

    this.currentMidiDuration;
    this.trackNb = 1;
    this.started = false;

    this.xfactor = 100;
    this.currentTime = 0;
    this.extrusionLength = 20;
    this.currentTrack = 2;
    this.loaded = false;

    this.sphere;
    this.lastSphereX = 1;
    this.camera;
    this.progress;
    this.gameScene;
    this.menuScene;

    this.pointsTracks = [];
    this.totalTrackLength;

    this.points = 0;
    this.menuGUI;
    this.gameGUI;

    this.densityBonusBoxPerTrack = 5 * this.xfactor; // on average, on each track, 1 box every x * xfactor seconds
    this.bonusBoxes;

    this.spherePhysics = {};
    this.spherePhysics.gravity = 0.02;
    this.spherePhysics.maximumSpeed = 2;
    this.spherePhysics.jumpFall = false;
    this.spherePhysics.currentSpeed = 0;
    this.spherePhysics.jumping = false;
    this.spherePhysics.jumpImpulse = -0.1;
    this.spherePhysics.maximumJump = -1;

    this.initialize = function() {
        this.menuScene = this.createMenuScene();

        // Register a render loop to repeatedly render the scene
        this.engine.runRenderLoop(() => {
            if (this.started) {
                this.gameScene.render();
                var delta = this.engine.getDeltaTime();
                this.currentTime = this.currentTime + delta;
                var percentage = this.currentTime / this.currentMidiDuration;


                lastSphereX = this.sphere.position.x;

                if (this.currentTrack > (this.pointsTracks.length - 1)) {
                    this.currentTrack = (this.pointsTracks.length - 1);
                }
                this.setPositionInPath(percentage, this.pointsTracks[this.currentTrack], this.totalTrackLength);
                this.gameGUI.getControlByName("pointsDisplay").text = "Points : " + this.points;

                for (var i = this.bonusBoxes.length - 1; i >= 0; i--) {
                    // display boxes & planes 5s in advance = 5 * this.xfactor

                    if (this.bonusBoxes[i].position.z - this.sphere.position.z < 10 * this.xfactor && !this.bonusBoxes[i].planeCreated) {
                        this.bonusBoxes[i].plane = BABYLON.MeshBuilder.CreatePlane("plane", {
                            height: 500,
                            width: this.extrusionLength,
                            sideOrientation: BABYLON.Mesh.DOUBLESIDE
                        }, this.gameScene);
                        this.bonusBoxes[i].plane.position = this.bonusBoxes[i].position;
                        this.bonusBoxes[i].plane.material = this.bonusBoxes[i].planeMaterial;
                        this.bonusBoxes[i].planeCreated = true;
                    }

                    if (this.bonusBoxes[i].planeCreated) {
                        if (this.bonusBoxes[i].position.z + 2 * this.xfactor < this.sphere.position.z) { // on a dépassé le bonus, on le vire bientot
                            this.bonusBoxes[i].dispose();
                            this.bonusBoxes[i].plane.dispose();
                            this.bonusBoxes.splice(i, 1);
                        } else {
                            this.bonusBoxes[i].rotation.y += 0.01 % (2 * Math.PI);
                            this.bonusBoxes[i].planeMaterial.alpha = -0.3 / (10 * this.xfactor) * (this.bonusBoxes[i].position.z - this.sphere.position.z) + 0.3;
                            if (this.sphere.intersectsMesh(this.bonusBoxes[i], false)) {
                                this.points += 50;
                            }
                        }
                    }
                }

            } else {
                this.menuScene.render();
            }
        });

        // Watch for browser/canvas resize events
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    this.createGameScene = function() {

        // Create the scene space
        var scene = new BABYLON.Scene(this.engine);

        // Add a camera to the scene and attach it to the canvas


        // Add lights to the scene
        var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
        var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), scene);

        // Add and manipulate meshes in the scene
        this.sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {
            diameter: 2
        }, scene);

        // Parameters : name, position, scene
        this.camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 0, -10), scene);

        // Targets the camera to a particular position. In this case the scene origin
        this.camera.setTarget(BABYLON.Vector3.Zero());

        // Attach the camera to the canvas
        //this.camera.attachControl(this.canvas, true);

        var inputMap = {};
        scene.actionManager = new BABYLON.ActionManager(scene);
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function(evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function(evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));

        // Game/Render loop
        scene.onBeforeRenderObservable.add(() => {
            if (inputMap["q"] || inputMap["ArrowLeft"]) {
                if (this.sphere.position.x > -this.extrusionLength * this.trackNb) {
                    this.sphere.position.x -= 0.5;
                }
            }
            if (inputMap["d"] || inputMap["ArrowRight"]) {
                if (this.sphere.position.x < 0) {
                    this.sphere.position.x += 0.5;
                }
            }
            if (inputMap["z"] || inputMap["ArrowUp"]) {
                if (!this.spherePhysics.jumping){
                    this.spherePhysics.jumping = true;
                    this.spherePhysics.jumpFall = false;
                    this.spherePhysics.currentSpeed = this.spherePhysics.jumpImpulse;
                } else {
                    if (!this.spherePhysics.jumpFall){
                        this.spherePhysics.currentSpeed += this.spherePhysics.jumpImpulse;
                        if (this.spherePhysics.currentSpeed < this.spherePhysics.maximumJump){
                            this.spherePhysics.jumpFall = true;
                        }
                    }
                }
            } else{
                if (this.spherePhysics.jumping){
                    this.spherePhysics.jumpFall = true;
                }
            }
            this.currentTrack = Math.floor(-this.sphere.position.x / this.extrusionLength);
        });

        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        var grid = new BABYLON.GUI.Grid();
        advancedTexture.addControl(grid);

        grid.width = "100%";

        grid.addColumnDefinition(25, true);
        grid.addColumnDefinition(0.5);
        grid.addColumnDefinition(0.5);
        grid.addColumnDefinition(25, true);


        grid.addRowDefinition(25, true);
        grid.addRowDefinition(0.5);
        grid.addRowDefinition(0.5);
        grid.addRowDefinition(25, true);


        var menuBtn = BABYLON.GUI.Button.CreateSimpleButton("menuBtn", "Menu");
        menuBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        menuBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        menuBtn.fontFamily = "Press Start 2P";
        menuBtn.cornerRadius = 20;
        menuBtn.paddingLeft = "20px";
        menuBtn.width = "100px";
        menuBtn.height = "40px";
        menuBtn.color = "white";
        menuBtn.background = "black";
        grid.addControl(menuBtn, 1, 1);


        var pointsDisplay = new BABYLON.GUI.TextBlock();
        pointsDisplay.name = "pointsDisplay";
        pointsDisplay.text = "Points : " + this.points;
        pointsDisplay.color = "white";
        pointsDisplay.width = "100%";
        pointsDisplay.fontFamily = "Press Start 2P";
        pointsDisplay.height = "70px";
        pointsDisplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        pointsDisplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        pointsDisplay.fontSize = 128;
        pointsDisplay.zindex = 50;
        pointsDisplay.fontStyle = "italic";
        grid.addControl(pointsDisplay, 1, 2);



        menuBtn.onPointerClickObservable.add(() => {
            this.started = false;
            this.loaded = false;
            Tone.Transport.stop();
            Tone.Transport.clearAll();
            Tone.Transport.cancel();
        });


        this.gameGUI = advancedTexture;

        this.spherePhysics.currentSpeed = 0;
        this.spherePhysics.jumping = false;
        this.spherePhysics.jumpFall = false;

        return scene;
    };

    this.createMenuScene = function() {

        var scene = new BABYLON.Scene(this.engine);
        scene.clearColor = new BABYLON.Color3(0.0071, 0.0047, 0.0055);

        var menuCamera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -30), scene);

        // This targets the camera to scene origin
        menuCamera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        //camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)

        //var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0,1, -20), scene);

        // Default intensity is 1. Let's dim the light a small amount
        //light.intensity = 0.7;
        var light = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, -1, 0), scene);


        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        var panel = new BABYLON.GUI.StackPanel();
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.isVertical = false;
        panel.height = "70%";
        //panel.paddingBottom = "90px";
        //panel.background="white";
        advancedTexture.addControl(panel);

        var image = new BABYLON.GUI.Image("but", "levelshiftlogo.png");
        image.stretch = BABYLON.GUI.Image.STRETCH_NONE;
        image.autoScale = true;
        advancedTexture.addControl(image);


        /*
            progress = new BABYLON.GUI.TextBlock();
            text1.text = "Hello world";
            text1.color = "white";
            text1.fontSize = 24;
            advancedTexture.addControl(text1); */

        /*
                var loadBtn = BABYLON.GUI.Button.CreateSimpleButton("loadBtn", "Load");
                loadBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
                loadBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
                loadBtn.fontFamily = "Press Start 2P";
                loadBtn.cornerRadius = 20;
                loadBtn.paddingLeft = "20px";
                loadBtn.width = "100px";
                loadBtn.height = "40px";
                loadBtn.color = "white";
                loadBtn.background = "black";
                panel.addControl(loadBtn);


                loadBtn.onPointerClickObservable.add(() => {
                    var element = document.createElement("input");
                    element.setAttribute("id", "importFile");
                    element.setAttribute("type", "file");
                    element.setAttribute("style", "visibility:hidden;")
                    element.addEventListener("change", e => {
                        //get the files
                        const files = e.target.files
                        if (files.length > 0){
                            const file = files[0]
                            console.log(file);
                            var r = new FileReader();
                            r.onload = function(e) {
                                    var contents = e.target.result;
                                    console.log(MidiConvert.decode(r.readAsArrayBuffer(file)));
                                }
                            r.readAsText(file);
                        }
                    });
                    element.click();
                });
        */

        var exampleBtn = BABYLON.GUI.Button.CreateSimpleButton("loadBtn", "Load Example");
        exampleBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        exampleBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        exampleBtn.fontFamily = "Press Start 2P";
        exampleBtn.cornerRadius = 20;
        exampleBtn.paddingLeft = "20px";
        exampleBtn.width = "150px";
        exampleBtn.height = "40px";
        exampleBtn.color = "white";
        exampleBtn.background = "black";
        panel.addControl(exampleBtn);

        var input1 = new BABYLON.GUI.InputText();
        input1.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        input1.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        input1.fontFamily = "Press Start 2P";
        input1.cornerRadius = 20;
        input1.paddingLeft = "20px";
        input1.width = "250px";
        input1.maxWidth = 0.2;
        input1.height = "40px";
        input1.text = "https://bitmidi.com/uploads/15916.mid";
        input1.color = "white";
        input1.background = "black";
        input1.zindex = 50;
        panel.addControl(input1);

        var loadFromUrlBtn = BABYLON.GUI.Button.CreateSimpleButton("loadFromUrlBtn", "Load from URL");
        loadFromUrlBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        loadFromUrlBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        loadFromUrlBtn.fontFamily = "Press Start 2P";
        loadFromUrlBtn.cornerRadius = 20;
        loadFromUrlBtn.paddingLeft = "20px";
        loadFromUrlBtn.width = "180px";
        loadFromUrlBtn.height = "40px";
        loadFromUrlBtn.color = "white";
        loadFromUrlBtn.background = "black";
        loadFromUrlBtn.zindex = 50;
        panel.addControl(loadFromUrlBtn);

        var playBtn = BABYLON.GUI.Button.CreateSimpleButton("playBtn", "Play");
        playBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        playBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        playBtn.cornerRadius = 20;
        playBtn.width = "100px";
        playBtn.fontFamily = "Press Start 2P";
        playBtn.paddingLeft = "20px";
        playBtn.height = "40px";
        playBtn.color = "white";
        playBtn.background = "black";
        playBtn.isEnabled = false;
        playBtn.zindex = 50;
        panel.addControl(playBtn);

        var errorDisplay = new BABYLON.GUI.TextBlock();
        errorDisplay.text = "Sorry, an error occurred while parsing the midi file. Please try another file!";
        errorDisplay.color = "red";
        errorDisplay.width = "70%";
        errorDisplay.fontFamily = "Press Start 2P";
        errorDisplay.height = "40px";
        errorDisplay.background = "red";
        errorDisplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        errorDisplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        errorDisplay.fontSize = 22;
        errorDisplay.zindex = 50;
        errorDisplay.top = -30;
        errorDisplay.fontStyle = "italic";


        var successDisplay = new BABYLON.GUI.TextBlock();
        successDisplay.text = "Successfully loaded MIDI file!";
        successDisplay.color = "green";
        successDisplay.width = "70%";
        successDisplay.fontFamily = "Press Start 2P";
        successDisplay.height = "40px";
        successDisplay.background = "red";
        successDisplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        successDisplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        successDisplay.fontSize = 22;
        successDisplay.zindex = 50;
        successDisplay.top = -30;
        successDisplay.fontStyle = "italic";

        playBtn.onPointerClickObservable.add(() => {
            if (this.loaded) {
                console.log("Started");
                Tone.Transport.start();
                this.started = true;
                this.currentTime = 0;
            }
        });


        exampleBtn.onPointerClickObservable.add(async () => {
            await checkLoadingSuccess("rhcp.mid");
        });
        loadFromUrlBtn.onPointerClickObservable.add(async () => {
            await checkLoadingSuccess("https://cors-anywhere.herokuapp.com/" + input1.text);
        });

        var checkLoadingSuccess = async (midi_url) => {
            var success = await this.loadMidi(midi_url);
            if (!success) {
                advancedTexture.removeControl(successDisplay);
                advancedTexture.addControl(errorDisplay);
                setTimeout(() => {
                    advancedTexture.removeControl(errorDisplay)
                }, 5000);
                playBtn.background = "black";
                playBtn.color = "white";
                playBtn.isEnabled = false;
            } else {
                advancedTexture.removeControl(errorDisplay);
                advancedTexture.addControl(successDisplay);
                setTimeout(() => {
                    advancedTexture.removeControl(successDisplay)
                }, 5000);
                playBtn.background = "#04d3e5";
                playBtn.color = "#e4046f";
                playBtn.isEnabled = true;
                this.loaded = true;
            }
        };

        this.menuGUI = advancedTexture;

        return scene;
    };

    this.setPositionInPath = function(percentage, points, totalTrackLength) {

        var trackPosition = percentage * totalTrackLength;

        var startingPoint = 0;

        for (var i = 1; i < points.length; i++) {
            if (points[i].x > trackPosition) {
                break;
            } else {
                startingPoint = i;
            }
        }

        var distance = (trackPosition - points[startingPoint].x) / (points[startingPoint + 1].x - points[startingPoint].x);

        //sphere.position.x = -points[startingPoint].z - extrusionLength/2;

        var floorY = points[startingPoint].y + distance * (points[startingPoint + 1].y - points[startingPoint].y) + 1;

            this.spherePhysics.currentSpeed += this.spherePhysics.gravity;
            if (this.spherePhysics.currentSpeed > this.spherePhysics.maximumSpeed){
                this.spherePhysics.currentSpeed =this.spherePhysics.maximumSpeed;
            }

            this.sphere.position.y = this.sphere.position.y - this.spherePhysics.currentSpeed;

            if (this.sphere.position.y <= floorY){
                this.spherePhysics.jumping = false;
                this.sphere.position.y = floorY;
                this.spherePhysics.currentSpeed = 0;
            }

        this.sphere.position.z = points[startingPoint].x + distance * (points[startingPoint + 1].x - points[startingPoint].x);



        this.camera.position.x = this.sphere.position.x;
        this.camera.position.y = this.sphere.position.y + 2;
        this.camera.position.z = this.sphere.position.z - 5;
    }

    //return success / error
    this.loadMidi = async function(url) {
        var success = true;
        delete this.gameScene;
        this.gameScene = this.createGameScene();
        await MidiConvert.load(url, (midi) => {
            if (typeof midi == "undefined") {
                success = false;
                return;
            }
            var myPath = [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, 0, this.extrusionLength)
            ];
            Tone.Transport.bpm.value = midi.header.bpm;
            this.currentMidiDuration = midi.duration * 1000;
            this.pointsTracks = [];
            var extrudedTracks = [];
            var trackNum = 0;
            var firstX = 9999;
            var lastX = 0;
            for (var i = 0; i < midi.tracks.length; i++) {
                if (midi.tracks[i].notes.length > 1) {
                    var trackPoints = getTrackSmoothedPoints(midi.tracks[i], 15, trackNum);
                    this.pointsTracks.push(trackPoints);

                    var extrusion = BABYLON.MeshBuilder.ExtrudeShape("circuit", {
                        shape: trackPoints,
                        path: myPath,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                        updatable: true
                    }, this.gameScene);
                    extrusion.rotate(BABYLON.Axis.Y, -Math.PI / 2, BABYLON.Space.WORLD);

                    var myMaterial = new BABYLON.StandardMaterial("myMaterial", this.gameScene);

                    myMaterial.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());

                    extrusion.material = myMaterial;

                    extrudedTracks.push(extrusion);
                    //var synth = new Tone.PolySynth(32).toMaster();

                    if (midi.tracks[i].channelNumber == 9) { // percussions

                        var percussionNotes = [];
                        var percussionParts = [];
                        for (var k = 0; k < midi.tracks[i].notes.length; k++) {
                            var noteIndex = percussionNotes.indexOf(midi.tracks[i].notes[k].midi);
                            if (noteIndex < 0) {
                                percussionNotes.push(midi.tracks[i].notes[k].midi);
                                percussionParts.push([midi.tracks[i].notes[k]]);
                            } else {
                                percussionParts[noteIndex].push(midi.tracks[i].notes[k]);
                            }
                        }


                        for (var k = 0; k < percussionParts.length; k++) {
                            //ex : https://surikov.github.io/webaudiofontdata/sound/12835_5_FluidR3_GM_sf2_file.js
                            var tag = percussionParts[k][0].midi + "_5_FluidR3_GM_sf2_file";

                            var url = 'https://surikov.github.io/webaudiofontdata/sound/128' + tag + '.js';
                            var variable = '_drum_' + tag;
                            var synth = new Tone.WebAudioFontInstrument(url, variable);
                            console.log(url);
                            console.log(variable);
                            addPart(percussionParts[k], synth, true);
                        }

                    } else {

                        var instrumentNumber = (midi.tracks[i].instrumentNumber) * 10;
                        //ex : https://surikov.github.io/webaudiofontdata/sound/0260_SoundBlasterOld_sf2.js
                        var tag = pad_with_zeroes(instrumentNumber, 4) + "_FluidR3_GM_sf2_file"; //"_SoundBlasterOld_sf2";

                        var url = 'https://surikov.github.io/webaudiofontdata/sound/' + tag + '.js';
                        var variable = '_tone_' + tag;
                        var synth = new Tone.WebAudioFontInstrument(url, variable);
                        console.log(url);
                        console.log(variable);
                        //synth.loadInstrument(url, variable);
                        addPart(midi.tracks[i].notes, synth, false);
                    }
                    trackNum++;
                }
            }
            this.trackNb = this.pointsTracks.length;

            this.totalTrackLength = this.xfactor * this.currentMidiDuration / 1000
            // determine first track that begins
            var earliestStartingTrack = 0;
            var earliestStartValue = 9999;
            for (var i = 0; i < this.pointsTracks.length; i++) {
                if (this.pointsTracks[i][0].x < earliestStartValue) {
                    earliestStartingTrack = i;
                    earliestStartValue = this.pointsTracks[i][0].x;
                }
            }

            this.bonusBoxes = [];
            for (var i = 0; i < this.trackNb; i++) {
                for (var j = 0; j < Math.floor(this.pointsTracks[i][this.pointsTracks[i].length - 1].x / this.densityBonusBoxPerTrack); j++) {
                    var randomPoint = this.pointsTracks[i][Math.floor(Math.random() * this.pointsTracks[i].length)];
                    var bonusBoxSize = 5;
                    var bonusBox = BABYLON.MeshBuilder.CreateBox("bonusBox" + j * (i + 1), {
                        height: bonusBoxSize,
                        width: bonusBoxSize,
                        depth: bonusBoxSize
                    }, this.gameScene);
                    bonusBox.position.x = -randomPoint.z - this.extrusionLength / 2;
                    bonusBox.position.y = randomPoint.y + bonusBoxSize / 2 + 1;
                    bonusBox.position.z = randomPoint.x;

                    bonusBox.planeCreated = false;

                    var myMaterial = new BABYLON.StandardMaterial("myMaterial", this.gameScene);
                    myMaterial.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
                    myMaterial.alpha = 0.0;
                    myMaterial.alphaMode = BABYLON.Engine.ALPHA_PREMULTIPLIED;

                    var opaqueMaterial = new BABYLON.StandardMaterial("myMaterial", this.gameScene);
                    opaqueMaterial.diffuseColor = myMaterial.diffuseColor;

                    bonusBox.planeMaterial = myMaterial;
                    bonusBox.material = opaqueMaterial;

                    this.bonusBoxes.push(bonusBox);
                }
            }

            this.currentTrack = earliestStartingTrack;

            // center sphere in middle of current track
            this.sphere.position.x = -this.pointsTracks[this.currentTrack][0].z - this.extrusionLength / 2;

            // pass in the note events from one of the tracks as the second argument to Tone.Part 

            // start the transport to hear the event
        });

        return success;; // all good
    }

};

window.midiGame.initialize();