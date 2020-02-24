var canvas = document.getElementById("renderCanvas"); // Get the canvas element 
var engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

var currentMidiDuration;
var trackNb = 1;
var started = false;

var xfactor = 100;
var currentTime = 0;
var extrusionLength = 30;
var currentTrack = 2;

/**
 * Normalizes a value from one range (current) to another (new).
 *
 * @param  { Number } val    //the current value (part of the current range).
 * @param  { Number } minVal //the min value of the current value range.
 * @param  { Number } maxVal //the max value of the current value range.
 * @param  { Number } newMin //the min value of the new value range.
 * @param  { Number } newMax //the max value of the new value range.
 *
 * @returns { Number } the normalized value.
 */
function normalizeBetweenTwoRanges(val, minVal, maxVal, newMin, newMax) {
    return newMin + (val - minVal) * (newMax - newMin) / (maxVal - minVal);
}

function calculatePoints(midiTrack, trackNum, extrudeLength) {
    var myPoints = [];

    for (var i = 0; i < midiTrack.notes.length; i++) {
        var separationBetweenTracks = 0;
        //var y = normalizeBetweenTwoRanges(midiNoteToHertz(midiData.tracks[2].notes[i].midi), 8, 12500, 0, 100)
        // transformation en hertz inutile
        // On transforme les points z en x parce que Babylonjs ne fait l'extrusion que en z
        // Apres on fait la rotation inverse de la mesh sur l'axe y par angle PI/2
        var x = midiTrack.notes[i].time * xfactor;
        var y = normalizeBetweenTwoRanges(midiTrack.notes[i].midi, 0, 127, 0, 50);
        var z = trackNum * (extrudeLength + separationBetweenTracks);
        var newPoint = new BABYLON.Vector3(x, y, z);
        myPoints.push(newPoint);
    }
    var lastNote = midiTrack.notes[midiTrack.notes.length - 1];
    myPoints.push(new BABYLON.Vector3((lastNote.time + lastNote.duration) * xfactor, normalizeBetweenTwoRanges(lastNote.midi, 0, 127, 0, 50), trackNum * (extrudeLength + separationBetweenTracks)));
    return myPoints;
}

function trackBuilder(points, offset) {
    var maxAngle = 0.78; // en radians, ~= 45°
    var z = points[0].z;
    var builtPoints = [];
    var firstPointX = points[0].x;
    var lastPointX = points[points.length - 1].x;
    var lastClosestPointIndex = 0;
    for (var i = firstPointX; i < lastPointX - offset; i += offset) {
        var newClosestPointIndex = lastClosestPointIndex;
        for (var j = lastClosestPointIndex; j < points.length - 1; j++) {
            if (points[j].x > i) {
                break;
            } else {
                newClosestPointIndex = j;
            }
        }
        var distance = (i - points[newClosestPointIndex].x) / (points[newClosestPointIndex + 1].x - points[lastClosestPointIndex].x);
        var newPointY = points[newClosestPointIndex].y + distance * (points[newClosestPointIndex + 1].y - points[newClosestPointIndex].y);

        var angle = Math.atan2(i - points[newClosestPointIndex].x, newPointY - points[newClosestPointIndex].y);

        if (angle > maxAngle && angle < -maxAngle) { // angle > 45°
            newPointY = (newPointY - points[newClosestPointIndex].y) * maxAngle / angle;
        }
        builtPoints.push(new BABYLON.Vector3(i, newPointY, z));
    }
    return builtPoints;
}

function smoothPoints(originalPoints, nbNewPoints) {
    return catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(originalPoints, nbNewPoints, false).getPoints();
}

function getTrackSmoothedPoints(midiTrack, nbPointsPerOldPoint, trackNum, extrudeLength) {
    return smoothPoints(trackBuilder(calculatePoints(midiTrack, trackNum, extrudeLength), 50), 5);
    //return calculatePoints(midiTrack, trackNum, extrudeLength);
}

var sphere;
var lastSphereX = 1;
var camera;
/******* Add the create scene function ******/
var createScene = function() {

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

    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    var panel = new BABYLON.GUI.StackPanel();
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    advancedTexture.addControl(panel);

    var lBtn = BABYLON.GUI.Button.CreateSimpleButton("but", "Left-Top");
    lBtn.width = "80px";
    lBtn.height = "40px";
    lBtn.color = "white";
    lBtn.background = "green";
    lBtn.left = "400px";
    panel.addControl(lBtn);

    lBtn.onPointerClickObservable.add(function() {
        console.log("Started");
        Tone.Transport.start();
        started = true;
        currentTime = 0;
    });

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
    })

    return scene;
};

/******* End of the create scene function ******/

var scene = createScene(); //Call the createScene function

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

function pad_with_zeroes(number, length) {

    var my_string = '' + number;
    while (my_string.length < length) {
        my_string = '0' + my_string;
    }

    return my_string;

}

var synths = [];
MidiConvert.load("CottonEyeJoe.mid", function(midi) {
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
            }, scene);
            extrusion.rotate(BABYLON.Axis.Y, -Math.PI / 2, BABYLON.Space.WORLD);

            var myMaterial = new BABYLON.StandardMaterial("myMaterial", scene);

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
                    addPart(percussionParts[k], synth);
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
                addPart(midi.tracks[i].notes, synth);
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


    // pass in the note events from one of the tracks as the second argument to Tone.Part 

    // start the transport to hear the event
});

function addPart(notes, synth) {
    new Tone.Part(function(time, note) {

        synth.toMaster();
        synth.triggerAttackRelease(note.name, time, note.velocity, note.duration);
        //setTimeout(synth.triggerRelease(), note.duration*1000);

    }, notes).start();
}

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function() {
    scene.render();
    if (started) {
        var delta = engine.getDeltaTime();
        currentTime = currentTime + delta;
        var percentage = currentTime / currentMidiDuration;


        lastSphereX = sphere.position.x;

        if (currentTrack > (pointsTracks.length - 1)) {
            currentTrack = (pointsTracks.length - 1);
        }
        setPositionInPath(percentage, pointsTracks[currentTrack], totalTrackLength);
    }
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function() {
    engine.resize();
});