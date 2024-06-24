function Vector2(x, y) {
    this.x = x;
    this.y = y;
    
    this.distance = function(v2) {
        return Math.sqrt(
            Math.pow(v2.y - this.x, 2) +
            Math.pow(v2.y - this.y, 2)
        );
    }
}

const Volumes = Object.freeze({
    sine_1d_terrain: 'Sine 1D Terrain',
    sine_2d_terrain: 'Sine 2D Terrain',
    circle: 'Circle',
    square: 'Square'
});

const Colors = Object.freeze({
    grid: "#fff",
    volume_flag_font_dark: "#000",
    volume_flag_font_bright: "#fff",
    volume_tint: "#1995AD",
    maching_square_border: "white",
})

var line_table = [
    -1, -1, -1, -1,
     0,  3, -1, -1,
     0,  1, -1, -1,
     1,  3, -1, -1,
     1,  2, -1, -1,
     0,  1,  2,  3,
     0,  2, -1, -1,
     2,  3, -1, -1,
     2,  3, -1, -1,
     0,  2, -1, -1,
     0,  3,  1,  2,
     1,  2, -1, -1,
     1,  3, -1, -1,
     0,  1, -1, -1,
     0,  3, -1, -1,
    -1, -1, -1, -1
]

var gridSize = 16,
    interpolationAccuracy = 0.01,
    voxelGrid = [],
    showGrid = true,
    showData = true,
    tintCells = true,
    volume = Volumes.sine_2d_terrain;


function createGrid() {
    for (var x=0; x<gridSize; x++) {
        voxelGrid[x] = [];
        for (var y=0; y<gridSize; y++) {
            voxelGrid[x][y] = getDensity(x, y);   
        }
    }
}

function createCircle(pos, rad) {
    for (var x = -rad; x < rad; x++) {
        for (var y = -rad; y < rad; y++) {
            if (Math.sqrt(x*x + y*y) < rad)
                voxelGrid[x+pos.x][y+pos.y] = 1;
            else
                voxelGrid[x+pos.x][y+pos.y] = 0;
        }
    }
}

var getDensity = function(x, y) {
    switch(volume) {
        case Volumes.sine_1d_terrain:
            if (y > Math.sin((x/gridSize*10)) * gridSize*0.3 + gridSize*0.5)
                return 1;
            return 0;
        case Volumes.sine_2d_terrain:
            if (y > (Math.sin((x/gridSize*10)) + Math.sin((y/gridSize*20))) * gridSize*0.3 + gridSize*0.6)
                return 1;
            return 0;
        case Volumes.circle:
           var middle = new Vector2(gridSize/2, gridSize/2);
            var dist = new Vector2(x, y).distance(middle);
            var rad = gridSize / 3;
            if (dist < rad) {
                return rad - dist / rad;
            }
            return 0;
        case Volumes.square:
            var quarter = gridSize * 0.25;
            var threeQuarters = gridSize - quarter;
            if (x > quarter && x < threeQuarters && y > quarter && y < threeQuarters)
                return 1;
            return 0;
    }
}

Math.lerp = function(t, s, e) {
    return t * (e - s);   
}

function lerpToAir(stepSize, start, end) {
    var lastDensity = getDensity(start.x, start.y);
    for (var i=0; i<1; i+=stepSize) {
        var pos = new Vector2(
            start.x + Math.lerp(i, start.x, end.x),
            start.y + Math.lerp(i, start.y, end.y)
        );
        var density = getDensity(pos.x, pos.y);
        if (density > 0 && lastDensity == 0 || density == 0 && lastDensity > 0 ) {
            return pos;
        }
        lastDensity = density
    }
    return end;
}

function drawGrid() {
    for (var x=0; x<gridSize; x++) {
        for (var y=0; y<gridSize; y++) {
            if (voxelGrid[x][y] == 1) {
                ctx.fillRect(x * unit, y * unit, unit, unit);
            }
        }
    }
}

function drawSquares() {
    var fontSize = 16 / gridSize * 12;
    var halfFontSize = fontSize * 0.5;
    ctx.font = fontSize+"px Arial";
  	ctx.lineWidth = 16/gridSize;
    var halfUnit = unit * 0.5;
    if (showGrid) {
        ctx.strokeStyle=Colors.grid;
        for (var x=0; x<gridSize; x++) {
            if (x != 0) {
                ctx.beginPath();
                ctx.moveTo(x * unit, 0);
                ctx.lineTo(x * unit, can.height);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, x * unit);
                ctx.lineTo(can.width, x * unit);
                ctx.stroke();
            }
        }
    }
    if (showData || tintCells) {
        for (var x=0; x<gridSize; x++) {
            for (var y=0; y<gridSize; y++) {
                var n = (getDensity(x+0.5, y+0.5) > 0) ? 1 : 0;
                if (n) {
                    if (tintCells) {
                        ctx.fillStyle = Colors.volume_tint;
                        ctx.fillRect(x * unit, y * unit, unit, unit);
                    }
                }
                if (showData) {
                    ctx.fillStyle = n ? Colors.volume_flag_font_dark : Colors.volume_flag_font_bright;
                    ctx.fillText(n, x * unit + halfUnit - halfFontSize * 0.5 , y * unit + halfUnit + halfFontSize);
                }
            }
        }
    }
}

function drawEdgeLines(start, end) {
    var startPos = lerpToAir(interpolationAccuracy, start[0], start[1]);
    var endPos   = lerpToAir(interpolationAccuracy, end[0], end[1]);
    ctx.moveTo(startPos.x * unit, startPos.y * unit);
    ctx.lineTo(endPos.x * unit, endPos.y * unit);
    ctx.stroke();
}

function marcheSquares() {
    ctx.beginPath();
    ctx.strokeStyle = Colors.maching_square_border;
  	ctx.lineWidth = 4;
    for (var x=0; x<gridSize; x++) {
        for (var y=0; y<gridSize; y++) {
            var v = [
                getDensity(x, y),
                getDensity(x+1, y),
                getDensity(x+1, y+1),
                getDensity(x, y+1)
            ];
            var tableIndex = 0;
            for (var i=0; i<4; i++) {
                if (v[i])
                    tableIndex += Math.pow(2, i);
            }
            tableIndex *= 4;
            var edges = [
                [new Vector2(x, y), new Vector2(x+1, y)],
                [new Vector2(x+1, y), new Vector2(x+1, y+1)],
                [new Vector2(x+1, y+1), new Vector2(x, y+1)],
                [new Vector2(x, y+1), new Vector2(x, y)]
            ]
            var l1 = line_table[tableIndex];
            if (l1 != -1) {
                drawEdgeLines(edges[l1], edges[line_table[tableIndex+1]]); 
            }
            var l2 = line_table[tableIndex+2];
            if (l2 != -1) {
                drawEdgeLines(edges[l2], edges[line_table[tableIndex+3]]); 
            }
        }
    }
}

function drawScene() {
    ctx.clearRect(0, 0, can.width, can.height);
    ctx.strokeStyle = "white";
    unit = can.width / gridSize;
    createGrid();
    drawSquares();
    marcheSquares();
}

function init() {

    gridSize = parseFloat(document.getElementById("gridSize").value)
    
    can = document.getElementById("screen");
    ctx = can.getContext("2d");
    document.getElementById("gridSize").addEventListener("input", function() {
        gridSize = parseFloat(this.value);
        drawScene();
    });
    document.getElementById("showGrid").addEventListener("change", function() {
        showGrid = !showGrid;
        drawScene();
    });
    document.getElementById("showData").addEventListener("change", function() {
        showData = !showData;
        drawScene();
    });
    document.getElementById("tintCells").addEventListener("change", function() {
        tintCells = !tintCells;
        drawScene();
    });
    document.getElementById("volume").addEventListener("change", function(e) {
        volume = e.target.options[e.target.selectedIndex].value;
        drawScene();
    });
    
    
    drawScene();
    
    window.onresize = function() {
        drawScene();
    }
}

document.addEventListener("DOMContentLoaded", init, false);