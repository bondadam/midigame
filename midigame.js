var canvas = document.getElementById("renderCanvas"); // Get the canvas element 
var engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
var currentMidiDuration;

function midiNoteToHertz(note) {
    return Math.pow(2, (note - 69) / 12) * 440
}

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
        var x = midiTrack.notes[i].time * 50
        var y = normalizeBetweenTwoRanges(midiTrack.notes[i].midi, 0, 127, 0, 50);
        var z = trackNum * (extrudeLength + separationBetweenTracks);
        var newPoint = new BABYLON.Vector3(x, y, z);
        myPoints.push(newPoint);
    }
    return myPoints;
}

function trackBuilder(points, offset) {
    var maxAngle = 0.78; // en radians, ~= 45°
    var z = points[0].z;
    var builtPoints = [];
    var firstPointX = points[0].x;
    var lastPointX = points[points.length - 1].x;
    var lastClosestPointIndex = 0;
    for (var i = firstPointX; i < lastPointX-offset; i += offset) {
        var newClosestPointIndex = lastClosestPointIndex;
        for (var j = lastClosestPointIndex; j < points.length - 1; j++) {
            if (points[j].x > i) {
                break;
            } else {
                newClosestPointIndex = j;
            }
        }
        var distance = (i - points[newClosestPointIndex].x) / (points[newClosestPointIndex + 1].x - points[lastClosestPointIndex].x);
        var newPointY = points[newClosestPointIndex].y + distance * (points[newClosestPointIndex + 1].y - points[newClosestPointIndex ].y);

        var angle = Math.atan2(i - points[newClosestPointIndex].x, newPointY - points[newClosestPointIndex].y);

        if (angle > maxAngle && angle < -maxAngle){ // angle > 45°
            newPointY = (newPointY - points[newClosestPointIndex].y) * maxAngle/angle;
        }
        builtPoints.push(new BABYLON.Vector3(i, newPointY, z));
    }
    return builtPoints;
}

function smoothPoints(originalPoints, nbNewPoints) {
    // use cubic bezier for maximum smoothing
    //var smoothedPoints = [];
    /*for (var i = 0; i < originalPoints.length-3; i = i + 3) {
        var bezier2Points = BABYLON.Curve3.CreateCubicBezier(originalPoints[i], originalPoints[i+1], originalPoints[i+2], originalPoints[i+3], nbNewPoints).getPoints();
        for (var j = 0; j < nbNewPoints; j++){
            smoothedPoints.push(bezier2Points[j]);
        }
    }*/

    return catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(originalPoints, nbNewPoints, false).getPoints();
}

function smoothPointsLagrange(points) {
    xyPoints = [];
    smoothedPoints = [];
    var l = new Lagrange(points[0].x, points[0].y, points[1].x, points[1].y);
    for (var i = 2; i < points.length; i++) {
        l.addPoint(points[i].x, points[i].y);
    }
    var firstPointX = points[0].x;
    var lastPointX = points[points.length - 1].x;
    var z = points[0].z;
    for (var x = firstPointX; x < lastPointX; x += 100) {
        var newPoint = new BABYLON.Vector3(x, l.valueOf(x), z);
        smoothedPoints.push(newPoint);
    }
    return smoothedPoints;
}

function setRollingAverage(points, nbAverage) { // nbAverage in either direction ie. 2 -> 2 1 2 -> 5, 3 -> 7, etc
    newPoints = points.slice();
    for (var i = 0; i < points.length; i++) {
        var newTotal = 0;
        var newAverageNb = 0;
        for (var j = i - nbAverage; j <= i + nbAverage; j++) {
            if (j >= 0 && j < points.length) {
                newTotal += points[j].y;
                newAverageNb++;
            }
        }
        newPoints[i].y = newTotal / newAverageNb;
    }
    return newPoints;
}

function getTrackSmoothedPoints(midiTrack, nbPointsPerOldPoint, trackNum, extrudeLength) {
    //return setRollingAverage(smoothPoints(calculatePoints(midiTrack, trackNum, extrudeLength), nbPointsPerOldPoint), 3);
    //return smoothPointsLagrange(calculatePoints(midiTrack, trackNum, extrudeLength));
    return smoothPoints(trackBuilder(calculatePoints(midiTrack, trackNum, extrudeLength), 5),5);
}

var showAxis = function(size) {
    var makeTextPlane = function(text, color, size) {
        var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
        dynamicTexture.hasAlpha = true;
        dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color, "transparent", true);
        var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
        plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
        plane.material.backFaceCulling = false;
        plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
        plane.material.diffuseTexture = dynamicTexture;
        return plane;
    };

    var axisX = BABYLON.Mesh.CreateLines("axisX", [
        new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    var xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
    var axisY = BABYLON.Mesh.CreateLines("axisY", [
        new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
    ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    var yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
    var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
        new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
    ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    var zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
};

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
    showAxis(8);

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
            console.log(sphere.position.x);
            sphere.position.x -= 0.1
        }
        if (inputMap["d"] || inputMap["ArrowRight"]) {
            sphere.position.x += 0.1
        }
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
    //console.log(trackPosition);
    //console.log(startingPoint);

    var distance = (trackPosition - points[startingPoint].x) / (points[startingPoint + 1].x - points[startingPoint].x);

    //sphere.position.x = -points[startingPoint].z;
    sphere.position.y = points[startingPoint].y + distance * (points[startingPoint + 1].y - points[startingPoint].y) + 2;
    sphere.position.z = points[startingPoint].x + distance * (points[startingPoint + 1].x - points[startingPoint].x);


    camera.position.x = sphere.position.x;
    camera.position.y = sphere.position.y + 2;
    camera.position.z = sphere.position.z - 5;
}


var synth = new Tone.PolySynth(8).toMaster()
MidiConvert.load("test.mid", function(midi) {
    var extrusionLength = 5;
    var myPath = [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, extrusionLength)
    ];
    Tone.Transport.bpm.value = midi.header.bpm;
    currentMidiDuration = midi.duration * 1000;
    var pointsTracks = [];
    var extrudedTracks = [];
    var trackNum = 0;
    var currentTime = 0;
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

                var midiPart = new Tone.Part(function(time, note) {

                //use the events to play the synth
                //currentTime = time * 1000;
                synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);

            }, midi.tracks[i].notes).start();
            trackNum++;
        }
    }

    var totalTrackLength = lastX - firstX;
    /*console.log(pointsTracks.length);
    console.log(midi.tracks.length);
    console.log(pointsTracks);*/


    // pass in the note events from one of the tracks as the second argument to Tone.Part 

    // start the transport to hear the events
    Tone.Transport.start();

    scene.registerAfterRender(function() {
        var delta = engine.getDeltaTime();
        currentTime = currentTime + delta;
        var percentage = currentTime / currentMidiDuration;
        lastSphereX = sphere.position.x;
        setPositionInPath(percentage, pointsTracks[1], totalTrackLength);
    });

});

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function() {
    scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function() {
    engine.resize();
});