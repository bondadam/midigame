window.midiGame = new function() {

    this.canvas = document.getElementById("renderCanvas"); // Get the canvas element 
    this.engine = new BABYLON.Engine(this.canvas, true); // Generate the BABYLON 3D engine

    this.currentMidiDuration;
    this.trackNb = 1;
    this.started = false;

    this.xfactor = 100;
    this.currentTime = 0;
    this.extrusionLength = 10;
    this.currentTrack = 2;
    this.loaded = false;

    this.sphere;
    this.lastSphereX = 1;
    this.camera;
    this.progress;

    this.backgroundScene;
    this.gameScene;
    this.menuScene;
    this.songSelectScene;

    // functions
    this.clearSong;
    this.checkLoadingSuccess;

    this.songSelection = false;

    this.pointsTracks = [];
    this.totalTrackLength;

    this.points = 0;
    this.gameOver = false;
    this.gameOverScene;

    this.gameOverGUI;
    this.menuGUI;
    this.gameGUI;

    this.densityBonusBoxPerTrack = 5 * this.xfactor; // on average, on each track, 1 box every x * xfactor seconds
    this.bonusBoxes;

    this.spherePhysics = {};
    this.spherePhysics.gravity = 0.03;
    this.spherePhysics.maximumSpeed = 2;
    this.spherePhysics.jumpFall = false;
    this.spherePhysics.currentSpeed = 0;
    this.spherePhysics.jumping = false;
    this.spherePhysics.jumpImpulse = -0.15;
    this.spherePhysics.maximumJump = -1;


    this.skyBox;
    this.skyBoxRotationCircleCenter = {
        "x": 0,
        "y": 0
    };
    this.skyBoxRotationRadius = 1;
    this.skyBoxAngleCurrent = 0;
    this.skyBoxAngleAdd = 0.001;

    this.initialize = function() {
        this.backgroundScene = this.createBackgroundScene();
        this.menuScene = this.createMenuScene();
        this.gameOverScene = this.createGameOverScene();
        this.songSelectionScene = this.createSongSelectScene();

        // Register a render loop to repeatedly render the scene
        this.engine.runRenderLoop(() => {
            if (this.started) {
                if (!this.gameOver){
                    this.renderGame();
                } else {
                    this.backgroundScene.render();
                    this.gameOverScene.render();

                }
            } else {
                if (this.songSelection) {
                    this.songSelectionScene.render();
                } else {
                    this.menuScene.render();
                }
            }
        });

        // Watch for browser/canvas resize events
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    this.renderGame = function() {
        var delta = this.engine.getDeltaTime();

        this.gameScene.render();

        this.currentTime = this.currentTime + delta;
        var percentage = this.currentTime / this.currentMidiDuration;


        lastSphereX = this.sphere.position.x;

        if (this.currentTrack > (this.pointsTracks.length - 1)) {
            this.currentTrack = (this.pointsTracks.length - 1);
        }
        this.setPositionInPath(percentage, this.pointsTracks[this.currentTrack], this.totalTrackLength);
        this.gameGUI.getControlByName("pointsDisplay").text = "Points : " + this.points;

        // afficher les boites bonus X secondes en avance, avec un certain alpha initial
        this.displayBonusBoxes(10, 0.3);

        var cycleHue = (phase) => {
            if (phase == undefined) phase = 0;
            var center = 0.5;
            var width = 0.5;
            red = Math.sin(this.currentTime * 0.0002 + 2 + phase) * width + center;
            green = Math.sin(this.currentTime * 0.0002 + 0 + phase) * width + center;
            blue = Math.sin(this.currentTime * 0.0002 + 4 + phase) * width + center;
            return new BABYLON.Color3(red, green, blue);
        }

        for (var i = 0; i < extrudedTracks.length; i++) {
            var cycledColor = cycleHue(i);
            extrudedTracks[i].material.lineColor = cycledColor;
        }

        this.skyBoxAngleCurrent = (this.skyBoxAngleCurrent + this.skyBoxAngleAdd) % (Math.PI * 2);
        this.skyBox.rotation.x = this.skyBoxRotationCircleCenter.x + this.skyBoxRotationRadius * Math.cos(this.skyBoxAngleCurrent);
        this.skyBox.rotation.y = this.skyBoxRotationCircleCenter.y + this.skyBoxRotationRadius * Math.sin(this.skyBoxAngleCurrent);
    };

    this.setPositionInPath = function(percentage, points, totalTrackLength) {

        var trackPosition = percentage * totalTrackLength;

        if (typeof points == 'undefined' || trackPosition > points[(points.length - 1)].x || trackPosition < points[0].x ) {
            this.spherePhysics.currentSpeed += this.spherePhysics.gravity;
            if (this.spherePhysics.currentSpeed > this.spherePhysics.maximumSpeed) {
                this.spherePhysics.currentSpeed = this.spherePhysics.maximumSpeed;
            }
            this.sphere.position.y -= this.spherePhysics.currentSpeed;
            this.sphere.position.z = trackPosition;
        } else {

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
            if (this.spherePhysics.currentSpeed > this.spherePhysics.maximumSpeed) {
                this.spherePhysics.currentSpeed = this.spherePhysics.maximumSpeed;
            }

            this.sphere.position.y = this.sphere.position.y - this.spherePhysics.currentSpeed;

            var distFromFloor = this.sphere.position.y - floorY;

            if (distFromFloor < 0.1 && distFromFloor > -3.1 || percentage > 0.99) {

                this.spherePhysics.jumping = false;
                this.sphere.position.y = floorY;
                this.spherePhysics.currentSpeed = 0;
            }
            console.log(distFromFloor);
            this.sphere.position.z = points[startingPoint].x + distance * (points[startingPoint + 1].x - points[startingPoint].x);

        }

        if (this.sphere.position.y < -50) {
            this.gameOver = true;
            this.gameOverGUI.getControlByName("pointsGameOverDisplay").text = this.points + " POINTS";
            this.stopSong();
            return;
        }

        this.camera.position.x = this.sphere.position.x;
        this.camera.position.y = this.sphere.position.y + 2;
        this.camera.position.z = this.sphere.position.z - 5;

    }

    this.displayBonusBoxes = function(advance, alpha) {
        for (var i = this.bonusBoxes.length - 1; i >= 0; i--) {
            if (this.bonusBoxes[i].position.z - this.sphere.position.z < advance * this.xfactor && !this.bonusBoxes[i].planeCreated) {
                this.bonusBoxes[i].plane = BABYLON.MeshBuilder.CreatePlane("plane", {
                    height: 500,
                    width: this.extrusionLength / 5,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE
                }, this.gameScene);
                this.bonusBoxes[i].plane.position = this.bonusBoxes[i].position;
                this.bonusBoxes[i].plane.material = this.bonusBoxes[i].planeMaterial;
                this.bonusBoxes[i].planeCreated = true;
            }
            if (this.bonusBoxes[i].planeCreated) {
                if (this.bonusBoxes[i].position.z + 2 * this.xfactor < this.sphere.position.z) {
                    // on a dépassé le bonus, on le vire bientot
                    this.bonusBoxes[i].dispose();
                    this.bonusBoxes[i].plane.dispose();
                    this.bonusBoxes.splice(i, 1);
                } else {
                    this.bonusBoxes[i].rotation.y += 0.01 % (2 * Math.PI);
                    this.bonusBoxes[i].planeMaterial.alpha = -alpha / (advance * this.xfactor) * (this.bonusBoxes[i].position.z - this.sphere.position.z) + alpha;
                    if (this.sphere.intersectsMesh(this.bonusBoxes[i], false)) {
                        this.points += 50;
                        this.bonusBoxes[i].dispose();
                        this.bonusBoxes[i].plane.dispose();
                        this.bonusBoxes.splice(i, 1);
                        this.spherePhysics.jumping = true;
                        this.spherePhysics.jumpFall = false;
                        this.spherePhysics.currentSpeed = this.spherePhysics.jumpImpulse*20;
                    }
                }
            }
        }
    };

    this.createGameScene = function() {

        // Create the scene space
        var scene = new BABYLON.Scene(this.engine);
        scene.autoClear = false;

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
        this.camera.attachControl(this.canvas, true);

        var inputMap = {};
        scene.actionManager = new BABYLON.ActionManager(scene);
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function(evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function(evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));

        var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {
            size: 500.0
        }, scene);
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.disableLighting = true;
        skybox.infiniteDistance = true;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("/textures/skybox/", scene, ["_px.png", "_py.png", "_pz.png", "_nx.png", "_ny.png", "_nz.png"]);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.alpha = 1;
        skybox.material = skyboxMaterial;

        this.skyBox = skybox;

        // Game/Render loop
        scene.onBeforeRenderObservable.add(() => {
            if (inputMap["q"] || inputMap["ArrowLeft"]) {
                //if (this.sphere.position.x > -this.extrusionLength * this.trackNb) {
                    this.sphere.position.x -= 0.5;
                //}
            }
            if (inputMap["d"] || inputMap["ArrowRight"]) {
                //if (this.sphere.position.x < 0) {
                    this.sphere.position.x += 0.5;
                //}
            }
            if (inputMap["z"] || inputMap["ArrowUp"]) {
                if (!this.spherePhysics.jumping) {
                    this.spherePhysics.jumping = true;
                    this.spherePhysics.jumpFall = false;
                    this.spherePhysics.currentSpeed = this.spherePhysics.jumpImpulse;
                } else {
                    if (!this.spherePhysics.jumpFall) {
                        this.spherePhysics.currentSpeed += this.spherePhysics.jumpImpulse;
                        if (this.spherePhysics.currentSpeed < this.spherePhysics.maximumJump) {
                            this.spherePhysics.jumpFall = true;
                        }
                    }
                }
            } else {
                if (this.spherePhysics.jumping) {
                    this.spherePhysics.jumpFall = true;
                }
            }
            this.currentTrack = Math.floor(-this.sphere.position.x / this.extrusionLength);
        });

        // GUI

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
        menuBtn.fontFamily = "vt323";
        menuBtn.cornerRadius = 20;
        menuBtn.paddingLeft = "20px";
        menuBtn.width = "100px";
        menuBtn.fontSize = 30;
        menuBtn.height = "40px";
        menuBtn.color = "white";
        menuBtn.background = "black";
        grid.addControl(menuBtn, 1, 1);


        var pointsDisplay = new BABYLON.GUI.TextBlock();
        pointsDisplay.name = "pointsDisplay";
        pointsDisplay.text = "Points : " + this.points;
        pointsDisplay.color = "white";
        pointsDisplay.width = "100%";
        pointsDisplay.fontFamily = "vt323";
        pointsDisplay.height = "70px";
        pointsDisplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        pointsDisplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        pointsDisplay.fontSize = 30;
        pointsDisplay.zIndex = 50;
        pointsDisplay.fontStyle = "italic";
        grid.addControl(pointsDisplay, 1, 2);


        menuBtn.onPointerClickObservable.add(() => {
            this.clearSong();
        });


        this.gameGUI = advancedTexture;

        this.spherePhysics.currentSpeed = 0;
        this.spherePhysics.jumping = false;
        this.spherePhysics.jumpFall = false;

        return scene;
    };

    this.createGameOverScene = function() {

        // Create the scene space
        var scene = new BABYLON.Scene(this.engine);
        scene.autoClear = false;

        var menuCamera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -30), scene);

        // This targets the camera to scene origin
        menuCamera.setTarget(BABYLON.Vector3.Zero());

        var light = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, -1, 0), scene);


        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        var panel = new BABYLON.GUI.StackPanel();
        advancedTexture.addControl(panel);


        var gameOverText = new BABYLON.GUI.TextBlock();
        gameOverText.text = "Game Over";
        gameOverText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        gameOverText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        gameOverText.fontFamily = "vt323";
        gameOverText.cornerRadius = 20;
        gameOverText.fontSize = 70;
        gameOverText.paddingTop = "20px";
        gameOverText.width = "500px";
        gameOverText.height = "200px";
        gameOverText.color = "#e4046f";
        panel.addControl(gameOverText);

        var pointsText = new BABYLON.GUI.TextBlock();
        pointsText.name = "pointsGameOverDisplay";
        pointsText.text = this.points + " POINTS";
        pointsText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        pointsText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        pointsText.fontFamily = "vt323";
        pointsText.cornerRadius = 20;
        pointsText.fontSize = 40;
        pointsText.paddingTop = "20px";
        pointsText.width = "500px";
        pointsText.height = "200px";
        pointsText.color = "#04d3e5";
        panel.addControl(pointsText);

        var restartBtn = BABYLON.GUI.Button.CreateSimpleButton("restartBtn", "Restart");
        restartBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        restartBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        restartBtn.fontFamily = "vt323";
        restartBtn.cornerRadius = 20;
        restartBtn.paddingTop = "20px";
        restartBtn.width = "500px";
        restartBtn.height = "60px";
        restartBtn.color = "white";
        restartBtn.background = "black";
        restartBtn.fontSize = 30;
        panel.addControl(restartBtn);

        restartBtn.onPointerClickObservable.add(async () => {
            this.gameOver = false;
            this.restartGame();
        });

        this.gameOverGUI = advancedTexture;

        return scene;
    };

    this.stopSong = function(){
        Tone.Transport.stop();
        Tone.Transport.clearAll();
        Tone.Transport.cancel();
    }

    this.clearSong = function() {
        this.started = false;
        this.loaded = false;
        this.menuGUI.getDescendants().find(control => control.name = "playBtn").color = "#e4046f";
        this.stopSong();
    }

    this.createBackgroundScene = function() {

        // ---
        // FShader
        // ---

        BABYLON.Effect.ShadersStore["customVertexShader"] = "precision highp float;\r\n" +

            "// Attributes\r\n" +
            "attribute vec3 position;\r\n" +
            "attribute vec3 normal;\r\n" +
            "attribute vec2 uv;\r\n" +

            "// Uniforms\r\n" +
            "uniform mat4 worldViewProjection;\r\n" +

            "// Varying\r\n" +
            "varying vec4 vPosition;\r\n" +
            "varying vec3 vNormal;\r\n" +
            "varying vec2 vUV;\r\n" +

            "void main() {\r\n" +

            "    vec4 p = vec4( position, 1. );\r\n" +

            "    vPosition = p;\r\n" +
            "    vNormal = normal;\r\n" +
            "    vUV = uv;\r\n" +
            "    gl_Position = worldViewProjection * p;\r\n" +

            "}\r\n";

        BABYLON.Effect.ShadersStore["customFragmentShader"] = "precision highp float;\r\n" +

            "uniform mat4 worldView;\r\n" +

            "varying vec4 vPosition;\r\n" +
            "varying vec3 vNormal;\r\n" +
            "uniform float time;\r\n" +

            "varying vec2 vUV;\r\n" +
            "uniform sampler2D textureSampler;\r\n" +
            "uniform sampler2D refSampler;\r\n" +

            "void main(void) {\r\n" +

            "    float s = 0.0, v = 0.0;\r\n" +
            "   vec2 uv = vUV.xy * 2.0 - 1.;\r\n" +
            "    float time = (time-2.0)*30.0;\r\n" +
            "   vec3 col = vec3(0);\r\n" +
            "    vec3 init = vec3(sin(time * .0032)*.3, .35 - cos(time * .005)*.3, time * 0.002);\r\n" +
            "   for (int r = 0; r < 100; r++) \r\n" +
            "   {\r\n" +
            "       vec3 p = init + s * vec3(uv, 0.05);\r\n" +
            "       p.z = fract(p.z);\r\n" +
            "        // Thanks to Kali's little chaotic loop...\r\n" +
            "       for (int i=0; i < 10; i++)  p = abs(p * 3.04) / dot(p, p) - .94;\r\n" +
            "       v += pow(dot(p, p), .8) * .06;\r\n" +
            "       col +=  vec3(v * 0.25+.1, 12.-s*2., .55 + v * 1.) * v * 0.00001;\r\n" +
            "       s += .045;\r\n" +
            "   }\r\n" +
            "   gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);\r\n" +
            "}\r\n";


        // ---
        // BG
        // ---

        const sceneBG = new BABYLON.Scene(this.engine);
        sceneBG.createDefaultCamera();
        const pp = new BABYLON.PostProcess('', 'custom', [
            // ---
            // uniforms in used
            // --- 
            "time",
            "cameraPosition",
            "worldViewProjection",
        ], [
            // ---
            // samplers in used
            // --- 
            //"refSampler",
            //"myTextureSampler",
        ], 1.0, sceneBG.activeCamera);

        var time = 0;
        pp.onApply = function(effect) {
            effect.setFloat("time", time);
            time += 0.02;
            effect.setVector3("cameraPosition", sceneBG.activeCamera.position);
        };


        // ---
        // Render BG then FG 
        // ---

        return sceneBG;
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

        var image = new BABYLON.GUI.Image("but", "/media/levelshiftlogo.png");
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
                loadBtn.fontFamily = "vt323";
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
        exampleBtn.fontFamily = "vt323";
        exampleBtn.cornerRadius = 20;
        exampleBtn.paddingLeft = "20px";
        exampleBtn.width = "300px";
        exampleBtn.height = "40px";
        exampleBtn.fontSize = 30;
        exampleBtn.color = "#04d3e5";
        exampleBtn.background = "black";
        panel.addControl(exampleBtn);

        var input1 = new BABYLON.GUI.InputText();
        input1.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        input1.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        input1.fontFamily = "vt323";
        input1.cornerRadius = 20;
        input1.paddingLeft = "20px";
        input1.width = "300px";
        input1.fontSize = 30;
        input1.maxWidth = 0.2;
        input1.height = "40px";
        input1.text = "https://bitmidi.com/uploads/87216.mid";
        input1.color = "#04d3e5";
        input1.background = "black";
        input1.zIndex = 50;
        panel.addControl(input1);

        var loadFromUrlBtn = BABYLON.GUI.Button.CreateSimpleButton("loadFromUrlBtn", "Load from URL");
        loadFromUrlBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        loadFromUrlBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        loadFromUrlBtn.fontFamily = "vt323";
        loadFromUrlBtn.fontSize = 30;
        loadFromUrlBtn.paddingLeft = "20px";
        loadFromUrlBtn.cornerRadius = 20;
        loadFromUrlBtn.width = "300px";
        loadFromUrlBtn.height = "40px";
        loadFromUrlBtn.color = "#04d3e5";
        loadFromUrlBtn.background = "black";
        loadFromUrlBtn.zIndex = 50;
        panel.addControl(loadFromUrlBtn);

        var playBtn = BABYLON.GUI.Button.CreateSimpleButton("playBtn", "Play");
        playBtn.name = "playBtn";
        playBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        playBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        playBtn.cornerRadius = 20;
        playBtn.fontSize = 30;
        playBtn.width = "300pxx";
        playBtn.fontFamily = "vt323";
        playBtn.paddingLeft = "20px";
        playBtn.height = "40px";
        playBtn.color = "#e4046f";
        playBtn.background = "black";
        playBtn.isEnabled = false;
        playBtn.zIndex = 50;
        panel.addControl(playBtn);

        var errorDisplay = new BABYLON.GUI.TextBlock();
        errorDisplay.text = "Sorry, an error occurred while parsing the midi file. Please try another file!";
        errorDisplay.color = "red";
        errorDisplay.fontSize = 30;
        errorDisplay.width = "70%";
        errorDisplay.fontFamily = "vt323";
        errorDisplay.height = "40px";
        errorDisplay.background = "red";
        errorDisplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        errorDisplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        errorDisplay.zIndex = 50;
        errorDisplay.top = -30;
        errorDisplay.fontStyle = "italic";

        var successDisplay = new BABYLON.GUI.TextBlock();
        successDisplay.text = "Successfully loaded MIDI file!";
        successDisplay.color = "green";
        successDisplay.fontSize = 30;
        successDisplay.width = "70%";
        successDisplay.fontFamily = "vt323";
        successDisplay.height = "40px";
        successDisplay.background = "red";
        successDisplay.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        successDisplay.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        successDisplay.zIndex = 50;
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
            this.songSelection = true;
        });
        loadFromUrlBtn.onPointerClickObservable.add(async () => {
            await this.checkLoadingSuccess("https://cors-anywhere.herokuapp.com/" + input1.text);
        });

        this.checkLoadingSuccess = async function(midi_url) {
            this.clearSong();
            var success = await this.loadMidi(midi_url);
            if (!success) {
                advancedTexture.removeControl(successDisplay);
                advancedTexture.addControl(errorDisplay);
                setTimeout(() => {
                    advancedTexture.removeControl(errorDisplay)
                }, 2500);
                playBtn.background = "black";
                playBtn.color = "white";
                playBtn.isEnabled = false;
            } else {
                advancedTexture.removeControl(errorDisplay);
                advancedTexture.addControl(successDisplay);
                setTimeout(() => {
                    advancedTexture.removeControl(successDisplay)
                    playBtn.color = "#04d3e5";
                    playBtn.isEnabled = true;
                    this.loaded = true;
                }, 2500);
            }
        };



        this.menuGUI = advancedTexture;

        return scene;
    };

    this.createSongSelectScene = function() {

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
        advancedTexture.addControl(panel);

        var image = new BABYLON.GUI.Image("logo", "/media/levelshiftlogo.png");
        image.stretch = BABYLON.GUI.Image.STRETCH_NONE;
        image.autoScale = true;
        image.zIndex = -50;
        advancedTexture.addControl(image);

        var colorAlternate = 0;
        samples.forEach(sample => {
            var path = "media/samples/" + sample.file;
            var title = sample.artist + " - " + sample.song;
            var sampleBtn = BABYLON.GUI.Button.CreateSimpleButton(path, title);
            sampleBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            sampleBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
            sampleBtn.fontFamily = "vt323";
            sampleBtn.cornerRadius = 20;
            sampleBtn.fontSize = 30;
            sampleBtn.paddingTop = "20px";
            sampleBtn.width = "500px";
            sampleBtn.height = "60px";
            sampleBtn.color = colorAlternate % 2 == 0 ? "#e4046f" : "#04d3e5";
            colorAlternate++;
            sampleBtn.background = "black";
            panel.addControl(sampleBtn);

            sampleBtn.onPointerClickObservable.add(async () => {
                this.songSelection = false;
                await this.checkLoadingSuccess(path);
            });


        });

        var backBtn = BABYLON.GUI.Button.CreateSimpleButton("backBtn", "Back to Menu");
        backBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        backBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        backBtn.fontFamily = "vt323";
        backBtn.cornerRadius = 20;
        backBtn.paddingTop = "20px";
        backBtn.width = "500px";
        backBtn.height = "60px";
        backBtn.color = "white";
        backBtn.background = "black";
        backBtn.fontSize = 30;
        panel.addControl(backBtn);

        backBtn.onPointerClickObservable.add(async () => {
            this.songSelection = false;
        });

        return scene;
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
            extrudedTracks = [];

            var earliestStartingTrackByTime = this.getEarliestStartingTrackByTime(midi);
            var trackNum = 0;
            var firstX = 9999;
            var lastX = 0;
            for (var i = 0; i < midi.tracks.length; i++) {
                if (midi.tracks[i].notes.length > 1) {
                    var trackPoints = getTrackSmoothedPoints(midi.tracks[i], 15, trackNum, i == earliestStartingTrackByTime);
                    this.pointsTracks.push(trackPoints);

                    var extrusion = BABYLON.MeshBuilder.ExtrudeShape("circuit", {
                        shape: trackPoints,
                        path: myPath,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                        updatable: true
                    }, this.gameScene);
                    extrusion.rotate(BABYLON.Axis.Y, -Math.PI / 2, BABYLON.Space.WORLD);

                    var trackLength = midi.tracks[i].notes[midi.tracks[i].notes.length - 1].time * 1.5;
                    console.log(trackLength);

                    var gridMaterial = new BABYLON.GridMaterial("gridMaterial", this.gameScene);
                    gridMaterial.majorUnitFrequency = 1;
                    gridMaterial.minorUnitVisibility = 0.45;
                    gridMaterial.gridRatio = 2;
                    gridMaterial.mainColor = new BABYLON.Color3(0, 0, 0);
                    gridMaterial.lineColor = new BABYLON.Color3(0.0, 1.0, 0.0);
                    gridMaterial.opacity = 0.99;
                    //gridMaterial.alphaMode = BABYLON.Engine.ALPHA_PREMULTIPLIED;
                    //gridMaterial.wireframe=true;


                    extrusion.material = gridMaterial;

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

            this.totalTrackLength = this.xfactor * this.currentMidiDuration / 1000;



            this.startGame();

            // pass in the note events from one of the tracks as the second argument to Tone.Part 

            // start the transport to hear the event
        });

        return success;; // all good
    }

    this.getEarliestStartingTrackByTime = function(midiFile) {
        var earliestStartingTrack;
        var earliestStartValue = 99999;
        console.log(midiFile);
        console.log(midiFile.tracks[0]);
        for (var i = 1; i < midiFile.tracks.length; i++) {
            if (midiFile.tracks[i].notes.length > 0 && midiFile.tracks[i].notes[0].time < earliestStartValue) {
                earliestStartingTrack = i;
                earliestStartValue = midiFile.tracks[i].notes[0].time;
            }
        }
        return earliestStartingTrack;
    }

    this.getEarliestStartingTrack = function() {
        var earliestStartingTrack = 0;
        var earliestStartValue = 9999;
        for (var i = 0; i < this.pointsTracks.length; i++) {
            if (this.pointsTracks[i][0].x < earliestStartValue) {
                earliestStartingTrack = i;
                earliestStartValue = this.pointsTracks[i][0].x;
            }
        }
        return earliestStartingTrack;
    }

    this.generateBoxes = function(earliestStartingTrack) {
        this.bonusBoxes = [];
        for (var i = 0; i < this.trackNb; i++) {
            for (var j = 0; j < Math.floor(this.pointsTracks[i][this.pointsTracks[i].length - 1].x / this.densityBonusBoxPerTrack); j++) {
                var randomPoint = this.pointsTracks[i][Math.floor(Math.random() * this.pointsTracks[i].length)];
                var bonusBoxSize = 2;
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
                //myMaterial.disableLighting = true;
                //myMaterial.backFaceCulling = false;
                /*var noiseTexture = new BABYLON.NoiseProceduralTexture("perlin", 256, this.gameScene);
                noiseTexture.octaves = 2;
                noiseTexture.persistence = 0.87;
                noiseTexture.animationSpeedFactor = 2.20;
                myMaterial.emissiveTexture = noiseTexture;*/

                var opaqueMaterial = new BABYLON.StandardMaterial("myMaterial", this.gameScene);
                opaqueMaterial.diffuseColor = myMaterial.diffuseColor;
                opaqueMaterial.wireframe = true;

                bonusBox.planeMaterial = myMaterial;
                bonusBox.material = opaqueMaterial;

                this.bonusBoxes.push(bonusBox);
            }
        }

        this.currentTrack = earliestStartingTrack;

        // center sphere in middle of current track
        this.sphere.position.x = -this.pointsTracks[this.currentTrack][0].z - this.extrusionLength / 2;

    }

    this.startGame = function() {
        var earliestStartingTrack = this.getEarliestStartingTrack();
        this.generateBoxes(earliestStartingTrack);

        this.currentTrack = earliestStartingTrack;

        // center sphere in middle of current track
        this.sphere.position.x = -this.pointsTracks[earliestStartingTrack][0].z - this.extrusionLength / 2;
        this.sphere.position.y = this.pointsTracks[earliestStartingTrack][0].y + 1;
        this.sphere.position.z = 0;

        this.currentSpeed = 0;
        this.points = 0;
    }

    this.restartGame = function() {
        this.stopSong();
        for (var i = 0; i < this.bonusBoxes.length; i++) {
            if (!this.bonusBoxes[i].isDisposed() && this.bonusBoxes[i].plane) {
                this.bonusBoxes[i].dispose();
                this.bonusBoxes[i].plane.dispose();
            }
        }
        Tone.Transport.start();
        this.started = true;
        this.currentTime = 0;
        this.points = 0;
        this.startGame();
    }

};

window.midiGame.initialize();