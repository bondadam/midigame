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

function calculatePoints(midiData) {
    var myPoints = [];

    for (var i = 0; i < midiData.tracks[2].notes.length; i++) {
        //var y = normalizeBetweenTwoRanges(midiNoteToHertz(midiData.tracks[2].notes[i].midi), 8, 12500, 0, 100)
        // transformation en hertz inutile
        // On transforme les points z en x parce que Babylonjs ne fait l'extrusion que en z
        // Apres on fait la rotation inverse de la mesh sur l'axe y par angle PI/2
        var x = midiData.tracks[2].notes[i].time * 15
        var y = normalizeBetweenTwoRanges(midiData.tracks[2].notes[i].midi, 0, 127, 0, 15);
        var z = 0
        var newPoint = new BABYLON.Vector3(x, y, z);
        myPoints.push(newPoint);
    }
    return myPoints;
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

    return scene;
};
/******* End of the create scene function ******/

var scene = createScene(); //Call the createScene function

function setPositionInPath(percentage, points) {

    startingPoint = Math.floor(percentage * points.length);
    distance = percentage % 1;

    sphere.position.x = points[startingPoint].z + distance * (points[startingPoint+1].z - points[startingPoint].z);
    sphere.position.y = points[startingPoint].y + distance * (points[startingPoint+1].y - points[startingPoint].y) + 2;
    sphere.position.z = points[startingPoint].x + distance * (points[startingPoint+1].x - points[startingPoint].x);


    camera.position.x = sphere.position.x;
    camera.position.y = sphere.position.y + 2;
    camera.position.z = sphere.position.z - 5;
}
var synth = new Tone.PolySynth(8).toMaster()
MidiConvert.load("test.mid", function(midi) {
    currentMidiDuration = midi.duration*1000;
    console.log(currentMidiDuration);
    var myPoints = smoothPoints(calculatePoints(midi), 30);
    //var lines = BABYLON.MeshBuilder.CreateLines("lines", {points: myPoints}, scene);
    var myPath = [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 10)
    ];
    var extrusion = BABYLON.MeshBuilder.ExtrudeShape("circuit", {
        shape: myPoints,
        path: myPath,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        updatable: true
    }, scene);
    extrusion.rotate(BABYLON.Axis.Y, -Math.PI / 2, BABYLON.Space.WORLD);


    // make sure you set the tempo before you schedule the events
    Tone.Transport.bpm.value = midi.header.bpm;

    var currentTime = 0;
    // pass in the note events from one of the tracks as the second argument to Tone.Part 
    var midiPart = new Tone.Part(function(time, note) {

        //use the events to play the synth
        currentTime = time*1000;
        synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);

    }, midi.tracks[2].notes).start();

    // start the transport to hear the events
    Tone.Transport.start();

    scene.registerAfterRender(function() {
        currentTime = currentTime + engine.getDeltaTime();
        var percentage = currentTime / currentMidiDuration;

        setPositionInPath(percentage, myPoints);
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