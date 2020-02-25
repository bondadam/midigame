var canvas = document.getElementById("renderCanvas"); // Get the canvas element 
var engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

var currentMidiDuration;
var trackNb = 1;
var started = false;

var xfactor = 100;
var currentTime = 0;
var extrusionLength = 20;
var currentTrack = 2;
var loaded = false;

var sphere;
var lastSphereX = 1;
var camera;
var progress;

var gameScene;
var menuScene;

/******* Add the create scene function ******/
var createGameScene = function() {

    // Create the scene space
    var scene = new BABYLON.Scene(engine);

    // Add a camera to the scene and attach it to the canvas


    // Add lights to the scene
    var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
    var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), scene);

    // Add and manipulate meshes in the scene
    sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {
        diameter: 2
    }, scene);

    // Parameters : name, position, scene
    camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 0, -10), scene);

    // Targets the camera to a particular position. In this case the scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // Attach the camera to the canvas
    camera.attachControl(canvas, true);

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
            if (sphere.position.x > -extrusionLength * trackNb) {
                sphere.position.x -= 0.1
            }
        }
        if (inputMap["d"] || inputMap["ArrowRight"]) {
            if (sphere.position.x < 0) {
                sphere.position.x += 0.1
            }
        }
        currentTrack = Math.floor(-sphere.position.x / extrusionLength);
    });

    var panel = new BABYLON.GUI.StackPanel();
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.isVertical = false;
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    advancedTexture.addControl(panel);

    var menuBtn = BABYLON.GUI.Button.CreateSimpleButton("menuBtn", "Menu");
    menuBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    menuBtn.fontFamily = "Press Start 2P";
    menuBtn.cornerRadius = 20;
    menuBtn.paddingLeft = "20px";
    menuBtn.width = "100px";
    menuBtn.height = "40px";
    menuBtn.color = "white";
    menuBtn.background = "black";
    panel.addControl(menuBtn);

    menuBtn.onPointerClickObservable.add(function() {
        started = false;
        loaded = false;
        Tone.Transport.stop();
        Tone.Transport.clearAll();
        Tone.Context.off();
        Tone.Context = new AudioContext();
    });



    return scene;
};


var createMenuScene = function() {


    var scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.0071, 0.0047, 0.0055);

    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -30), scene);

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

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

    var input1 = new BABYLON.GUI.InputText();
    input1.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    input1.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    input1.fontFamily = "Press Start 2P";
    input1.cornerRadius = 20;
    input1.paddingLeft = "20px";
    input1.width = "250px";
    input1.maxWidth = 0.2;
    input1.height = "40px";
    input1.text = "";
    input1.color = "white";
    input1.background = "black";
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
    panel.addControl(playBtn);

    playBtn.onPointerClickObservable.add(function() {
        if (loaded) {
            console.log("Started");
            Tone.Transport.start();
            started = true;
            currentTime = 0;
        }
    });

    loadFromUrlBtn.onPointerClickObservable.add(async function() {
        await loadMidi(input1.text);
        playBtn.isEnabled=true;
    });

    return scene;
}

/******* End of the create scene function ******/


function setPositionInPath(percentage, points, totalTrackLength) {

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
    sphere.position.y = points[startingPoint].y + distance * (points[startingPoint + 1].y - points[startingPoint].y) + 1;
    sphere.position.z = points[startingPoint].x + distance * (points[startingPoint + 1].x - points[startingPoint].x);



    camera.position.x = sphere.position.x;
    camera.position.y = sphere.position.y + 2;
    camera.position.z = sphere.position.z - 5;
}

async function loadMidi(url) {
    MidiConvert.load(url, function(midi) {
        console.log(midi);
        var myPath = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(0, 0, extrusionLength)
        ];
        Tone.Transport.bpm.value = midi.header.bpm;
        currentMidiDuration = midi.duration * 1000;
        pointsTracks = [];
        var extrudedTracks = [];
        var trackNum = 0;
        var firstX = 9999;
        var lastX = 0;
        for (var i = 0; i < midi.tracks.length; i++) {
            if (midi.tracks[i].notes.length > 1) {
                var trackPoints = getTrackSmoothedPoints(midi.tracks[i], 15, trackNum, extrusionLength);
                pointsTracks.push(trackPoints);
                if (trackPoints[0].x < firstX) {
                    firstX = trackPoints[0].x;
                }

                if (trackPoints[trackPoints.length - 1].x > lastX) {
                    lastX = trackPoints[trackPoints.length - 1].x;
                }

                var extrusion = BABYLON.MeshBuilder.ExtrudeShape("circuit", {
                    shape: trackPoints,
                    path: myPath,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                    updatable: true
                }, gameScene);
                extrusion.rotate(BABYLON.Axis.Y, -Math.PI / 2, BABYLON.Space.WORLD);

                var myMaterial = new BABYLON.StandardMaterial("myMaterial", gameScene);

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
        trackNb = pointsTracks.length;

        totalTrackLength = xfactor * currentMidiDuration / 1000
        // determine first track that begins
        var earliestStartingTrack = 0;
        var earliestStartValue = 9999;
        for (var i = 0; i < pointsTracks.length; i++) {
            if (pointsTracks[i][0].x < earliestStartValue) {
                earliestStartingTrack = i;
                earliestStartValue = pointsTracks[i][0].x;
            }
        }

        currentTrack = earliestStartingTrack;

        // center sphere in middle of current track
        sphere.position.x = -pointsTracks[currentTrack][0].z - extrusionLength / 2;

        loaded = true;

        // pass in the note events from one of the tracks as the second argument to Tone.Part 

        // start the transport to hear the event
    });
}

gameScene = createGameScene(); //Call the createScene function
menuScene = createMenuScene();

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function() {
    if (started) {
        gameScene.render();
        var delta = engine.getDeltaTime();
        currentTime = currentTime + delta;
        var percentage = currentTime / currentMidiDuration;


        lastSphereX = sphere.position.x;

        if (currentTrack > (pointsTracks.length - 1)) {
            currentTrack = (pointsTracks.length - 1);
        }
        setPositionInPath(percentage, pointsTracks[currentTrack], totalTrackLength);
    } else {
        menuScene.render();
    }
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function() {
    engine.resize();
});