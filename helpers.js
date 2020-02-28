
BABYLON.GUI.AdvancedDynamicTexture.prototype.executeOnAllControls = function(func, container) {
    // console.log('hijacked eoac run.  container: ', container);
    if (!container) {
        container = this._rootContainer;
    }
    for (var _i = 0, _a = container.children; _i < _a.length; _i++) {
        var child = _a[_i];
        if (child.children) {
            this.executeOnAllControls(func, child);
            continue;
        }
        func(child);
    }
};

BABYLON.GUI.AdvancedDynamicTexture.prototype.getControlByName = function(name) {
    var foundControl = null;
    if (name) {
        this.executeOnAllControls(function(control) {
            if (control.name && control.name === name) {
                foundControl = control;
            }
        }, this._rootContainer);
    }
    return foundControl;
};

function normalizeBetweenTwoRanges(val, minVal, maxVal, newMin, newMax) {
    return newMin + (val - minVal) * (newMax - newMin) / (maxVal - minVal);
}

function calculatePoints(midiTrack, trackNum) {
    var normalizationRange = 100;
    var myPoints = [];

    for (var i = 0; i < midiTrack.notes.length; i++) {
        var separationBetweenTracks = 0;
        //var y = normalizeBetweenTwoRanges(midiNoteToHertz(midiData.tracks[2].notes[i].midi), 8, 12500, 0, 100)
        // transformation en hertz inutile
        // On transforme les points z en x parce que Babylonjs ne fait l'extrusion que en z
        // Apres on fait la rotation inverse de la mesh sur l'axe y par angle PI/2
        var x = midiTrack.notes[i].time * window.midiGame.xfactor;
        var y = normalizeBetweenTwoRanges(midiTrack.notes[i].midi, 0, 127, 0, normalizationRange);
        var z = trackNum * (window.midiGame.extrusionLength + separationBetweenTracks);
        var newPoint = new BABYLON.Vector3(x, y, z);
        myPoints.push(newPoint);
    }
    var lastNote = midiTrack.notes[midiTrack.notes.length - 1];
    myPoints.push(new BABYLON.Vector3((lastNote.time + lastNote.duration) * window.midiGame.xfactor, normalizeBetweenTwoRanges(lastNote.midi, 0, 127, 0, normalizationRange), trackNum * (window.midiGame.extrusionLength + separationBetweenTracks)));
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

function getTrackSmoothedPoints(midiTrack, nbPointsPerOldPoint, trackNum) {
    return smoothPoints(trackBuilder(calculatePoints(midiTrack, trackNum), 50), 5);
    //return calculatePoints(midiTrack, trackNum, extrudeLength);
}

function pad_with_zeroes(number, length) {

    var my_string = '' + number;
    while (my_string.length < length) {
        my_string = '0' + my_string;
    }

    return my_string;

}

function addPart(notes, synth, isPercussion) {
    new Tone.Part(function(time, note) {

        synth.toMaster();
        if (isPercussion){
             synth.triggerAttackRelease(note.name, time, note.velocity, 20);
        } else{
            synth.triggerAttackRelease(note.name, time, note.velocity, note.duration);
        }
        //setTimeout(synth.triggerRelease(), note.duration*1000);

    }, notes).start();
}
