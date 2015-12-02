function Target(){
    this.id = Date.now();
    this.x = [];
    this.y = [];
    this.t = [];
    this.width = 0.1;
	this.type = null;
	this.instruction = null;
}


function clientToVideo(vp, clientX, clientY) {
    var relX = (clientX - vp.offsetLeft) / vp.offsetWidth;
    var relY = (clientY - vp.offsetTop) / vp.offsetHeight;    
    return [relX, relY]
}   

function videoToClient(vp, relX, relY) {
    var clientX = relX * vp.offsetWidth + vp.offsetLeft
    var clientY = relY * vp.offsetHeight + vp.offsetTop
    return [clientX, clientY]
}


/**
 *   Assuming a sorted array arr, return the index where the val  
 *   should be inserted in order to keep the arr sorted.
 */
function where(arr, val) {
        var x = arr.length;
    for (var i=0; i<arr.length; i++) {
        if (val < arr[i]) { 
            x = i;
            break;
        } 
    }
    return x;
}


/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
