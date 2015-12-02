

function loadTargets() {
    var targets = null;
    var targets_s = localStorage.getItem("targets");

    if (targets_s != null) {
        targets = JSON.parse(targets_s);
    } else {
        targets = {};
    }
    return targets;
}
    

function getTargets(src) {
    
    var targets = loadTargets();
    // If the clipname is not present, an empty array is returned for convenience. 

    var clipname = src.split("/").pop();
    var src_trgs = targets[clipname];
    if (typeof src_trgs == "undefined") { // if empty
        src_trgs = [];
    }
    
    return src_trgs;
}


function saveTargets(targets) {
    localStorage.setItem("targets_bak", localStorage.getItem("targets"));
    localStorage.setItem("targets", JSON.stringify(targets));
}


var anno_targets = null;
var anno_target_icons = []; // icon elements to display each target
var current_anno_target = null;
var UPDATE_DISPLAY_INTERVAL = 100;
var gui_append_mode;
var CACHED_PLAYBACK_SHOTS = null;


addTargetPoint = function(trg, x, y, t) {
    var loc = where(trg.t, t);
    trg.t.splice(loc, 0, t);
    trg.x.splice(loc, 0, x);
    trg.y.splice(loc, 0, y);
    
    saveAnnoTargets();
    
}

delTargetPoint = function(trg, loc) {
    trg.x.splice(loc, 1);
    trg.y.splice(loc, 1);
    trg.t.splice(loc, 1);    
    saveAnnoTargets();
}




function delAnnoTarget(trg_ind) {
    if (current_anno_target == anno_targets[trg_ind]) {
        current_anno_target = null;
    }
    anno_targets.splice(trg_ind, 1);
    
    saveAnnoTargets();
    
    updateTargetIcon();
    updateTargetList();
}


function createTarget() {
    current_anno_target = new Target()
    anno_targets.push(current_anno_target);
}

function selectTarget(trg_ind) {
    current_anno_target = anno_targets[trg_ind];
}

function findLastNegIndex(arr) {
    var lni = null;
    for (var i=0; i<arr.length; i++) {
        if (arr[i] < 0) { 
            lni = i;
        } else {
            break
        }
    }
    return lni;
}


function loadVideo(filename) {
    var vplayer = document.getElementById("videoplayer");
    var clippath = document.getElementById("clippath").value;

    var src = clippath + filename;
    
    var n = src.indexOf('fakepath');
    if (n != -1){
        u = src.substring(n-3, n+9);
        src = src.replace(u, "");
    }
    
   vplayer.src = src;
   
   anno_targets = getTargets(vplayer.src);
    
}


function guiSaveTargets() {
    var targets = localStorage.getItem("targets");
    var blob = new Blob([targets], {type : "text/plain;charset=utf-8"});
    saveAs(blob, "trubike_targets.json");
}



function updateTargetIcon() {
   
    var vplayer = document.getElementById("videoplayer");
    var target_icon_tmpl = document.getElementById("target_icon_tmpl");
    var ctime = vplayer.currentTime;

    var src_trgs = anno_targets; // from memory
    
    for (var i=0; i < src_trgs.length; i++) {

        // copy a new target icon if not enought icons
        if (! (i < anno_target_icons.length) ) {
            anno_target_icons[i] = target_icon_tmpl.cloneNode(true);
            anno_target_icons[i].id = "target_icon_" + i; 		
            document.getElementById("videobox").appendChild(anno_target_icons[i]);
            
            $("#" + anno_target_icons[i].id).click( function(ev) {
                videoClicked(ev);
            });
            
        }
        
        var trg = src_trgs[i];

        var ticon = anno_target_icons[i];
        
        // The problem: If you jump to the start time of a target, then the video player may actually get slightly smaller 
        // value, because all the times are floating point numbers. Therefore, it is necessary to round them to precision of 10 ms.
        
        var loc = where(trg.t.map(function(x) { return Math.round(x*100);}), Math.round(100*ctime));
        
        var do_display = 'no';

        if (0 < loc & loc < trg.t.length) {
            do_display = 'normal';
            loc = loc -1;
            
        } else if (current_anno_target != null && trg.id == current_anno_target.id && trg.t.length == loc) { 
            // last pos of current anno target is displayed afterwards
            do_display = 'ghost';
            loc = loc - 1;
        }
        
        if (do_display != 'no') { 
            
            var ticon_width = vplayer.offsetWidth * trg.width;
            var ticon_height = vplayer.offsetWidth * trg.width;
                    
            
            var videoCoords = videoToClient(vplayer, trg.x[loc], trg.y[loc]);
            var centering = [ticon_width / 2.0, 
                             ticon_height / 2.0];
            
            console.log("videoCoords", videoCoords);
            
            ticon.style.left = videoCoords[0] - centering[0] + "px";
            ticon.style.top = videoCoords[1] - centering[1] + "px";
            ticon.style.width = ticon_width + "px";
            ticon.style.height = ticon_height + "px";

            // If it is the current, use another color
            if (current_anno_target != null && trg.id == current_anno_target.id) {
                ticon.style.background = "red";
            } else {
                ticon.style.background = "blue";
            }

            if (trg.type == 'occlusion') {
                ticon.style.borderRadius = "0%";
            } else {
                ticon.style.borderRadius = "50%";
            }

            if (do_display == 'ghost') {
                ticon.style.opacity = 0.2;
            } else {
                ticon.style.opacity = 0.5;
            }
            
            
            ticon.style.display = "block";
            ticon.style.position = "absolute";

        } else { // make it hide if not currently visible
            ticon.style.display = "none";
        }
    }
    
    // clear spurious anno target icons
    for (var i=src_trgs.length; i<anno_target_icons.length; i++) {
        console.log(src_trgs.length, anno_target_icons.length, i, anno_target_icons[i].id);
        document.getElementById("videobox").removeChild(anno_target_icons[i]);
    }
    anno_target_icons = anno_target_icons.splice(0, src_trgs.length);
    
}


function updateTargetList() {
    var vplayer = $(videoplayer)[0];
    var src_trgs = anno_targets; 
    
    var html = "";
    
    html += '<p>';
    for (var j=0; j<src_trgs.length; j++) {
        html += '<button onclick="selectTarget('+ j +'); updateTargetList();">'+ j + '</button>'; 
    }
    html += '<button onclick="createTarget(); updateTargetList();">+</button>'; 
    html += '</p>';
    
    
    for (var j=0; j<src_trgs.length; j++) {        
        if (current_anno_target != null && current_anno_target.id == src_trgs[j].id) {
            var trg = current_anno_target;
           
            html += '<p>';
            html += 'Current target: ' + j + '<button onclick="delAnnoTarget('+ j +'); updateTargetList();">X</button>';
            html += '</p>';
            
            html +='Width: <input size="5" id="target_width" type="text" value="'+ trg.width +'" onchange="setCurrentAnnoTargetProperties();"/><br />'
            
            function isSelected(option) {
                if (option === current_anno_target.type) {
                    return "selected";
                } else {
                    return "";
                }
            }
            
            html +='<select id="target_type" onchange="setCurrentAnnoTargetProperties();">';
            html +='<option value="roaduser" '+ isSelected("road_user") + ' >1 Road user</option>';
            html +='<option value="roaduser_pedestrian" '+ isSelected("pedestrian") + ' >1.1 Pedestrian</option>';
            html +='<option value="roaduser_bicycle" '+ isSelected("bicycle") + ' >1.2. Bicycle</option>';
            html +='<option value="roaduser_car" '+ isSelected("car") + ' >1.3. Car</option>';

            html +='<option value="occlusion" '+ isSelected("occlusion") + ' >2 Occlusion</option>';
            html +='<option value="occlusion_mroad" '+ isSelected("occlusion_mroad") + '>2.1 Merging road</option>';
            html +='<option value="occlusion_mparking" '+ isSelected("occlusion_mparking") + ' >2.2 Merging parking place</option>';
            html +='<option value="occlusion_mpath" '+ isSelected("occlusion_mpath") + ' >2.3 Merging path</option>';
            html +='<option value="occlusion_stoppedveh" '+ isSelected("occlusion_stoppedveh") + ' >2.4 Stopped vehicle</option>';
            html +='<option value="occlusion_busstop" '+ isSelected("occlusion_busstop") + ' >2.5 Bus stop</option>';
            
            html +='<option value="nothing" '+ isSelected("nothing") + ' >3 Empty</option>';
            
            
            html +='<option value="other" '+ isSelected("other") + ' >4 Other</option>';
            
            html +='</select>';
            
            html += "<p>List of target points:</p>"
            html += "<table>";
        
            // Show points
            console.log(trg);
            for (var i=0; i<trg.t.length; i++) {  
            
                var t = trg.t[i].toPrecision(3);
                var x =  trg.x[i].toPrecision(3);
                var y = trg.y[i].toPrecision(3);

                var line = "".concat("<tr><td>",
                                        (i+1) +'. <button onclick="seekVideo('+t+', false)">'+t+'</button>',
                                        "</td><td>",
                                        x,
                                        "</td><td>",
                                        y,
                                        "</td><td>",
                                        '<button onclick="delTargetPoint(anno_targets[' + j +'],'+ i +'); updateTargetList();">X</button>',
                                        "</td></tr>");
                html += line;
            }
                
            html += "</table>"
        }
    }
    
    var targetlist = document.getElementById("targetlist");
    targetlist.innerHTML = html;
}

function updateVideoPositionIndicator() {
    var vplayer = document.getElementById("videoplayer");
    var vpos = document.getElementById("videoposition");
    
    var posval = vplayer.currentTime.toPrecision(3);
    vpos.value = posval;
}


function pauseVideo() {
    var vplayer = document.getElementById("videoplayer");
    vplayer.pause();
}

function playPauseVideo() {
    var vplayer = document.getElementById("videoplayer");
    if (!vplayer.paused) {
        vplayer.pause();
    } else {
        vplayer.play();
    }
}

function playVideo(rate) {
    //console.log("playVideo " + rate)
    var vplayer = document.getElementById("videoplayer");
    vplayer.playbackRate = rate;
    vplayer.play();
    
}


function saveAnnoTargets() {
    /*  
        Sets the currently open anno targets to the right place
        to the all_targets, and then the all_targets is jsoned to the localStorage.
    */
    
    
    var src = document.getElementById("videoplayer").src;
    var clipname = src.split("/").pop();

    var all_targets = loadTargets();
    
    if (! all_targets.hasOwnProperty(clipname)) { 
        all_targets[clipname] = [];
    }
    //console.log(typeof targets);
    all_targets[clipname] = anno_targets;
    
    saveTargets(all_targets);
}



function setCurrentAnnoTargetProperties() {
    
    var type = document.getElementById("target_type").value;
    current_anno_target.type = type;
    
    
    var target_width = parseFloat(document.getElementById("target_width").value);
    current_anno_target.width = target_width;
    
    
    saveAnnoTargets();
}


function seekVideo(time, relative) {
   var vplayer = document.getElementById("videoplayer");
   if (relative) { // time is relative to the currentTime
        vplayer.currentTime = vplayer.currentTime + time;
   } else {
        vplayer.currentTime = time;
   }
}

function videoClicked(ev) {
    var ctime = $(videoplayer)[0].currentTime;
    var src = $(videoplayer)[0].src;
    
    if (ctime > 0.0) {
        var relcoords = clientToVideo($(videoplayer)[0], ev.clientX, ev.clientY)
        var x = relcoords[0]
        var y = relcoords[1]
    
        console.log("Video clicked: "+ x +", "+ y);
        
        if (current_anno_target == null) {
            createTarget();
        }
        addTargetPoint(current_anno_target, x, y, ctime)
        
        updateDisplay();
    }
}

function updateDisplay() {
        updateTargetIcon();
        updateVideoPositionIndicator();
}


$(document).ready(function(){	
    var update_display_interval_id = null;
       
    var vplayer = document.getElementById("videoplayer");
    
    $(videoplayer).click( function(ev) {
        videoClicked(ev);
    });
    
    
    vplayer.addEventListener("playing", function() {
        if (update_display_interval_id == null) { // do not make duplicates
            update_display_interval_id = setInterval( updateDisplay, UPDATE_DISPLAY_INTERVAL); 
        }
    });
    
    vplayer.addEventListener("pause", function() {
        clearInterval(update_display_interval_id);
        update_display_interval_id = null;
        
        updateDisplay();
        // save the anno targets when video pauses
        // we want to avoid saving during the video presentation/clicking, because it
        // saving may take some time and create conflicts
        saveAnnoTargets();
    });
            
            
    vplayer.addEventListener("seeked", function() { 
        updateDisplay();
    });

    vplayer.addEventListener("canplay", function() { updateTargetList() });

    var videosrc = document.getElementById("videosrc");
    videosrc.addEventListener("change", function() {
        loadVideo(videosrc.value);   
        
        updateDisplay();
    });

    /* When a new postion is entered manually. */
    var vpos = document.getElementById("videoposition");
    vpos.addEventListener("change", function() {
        var newpos = parseFloat(vpos.value);
        seekVideo(newpos, false);
    });
    
    /* Loading targets from JSON file */
    $("#targetssrc").change( function(ev) {
        var file = ev.target.files[0];
        console.log(file);
        result = window.confirm("Loading targets from json file will OVERWRITE your current targets permanently!");
        if (result) {
            var reader = new FileReader();
            reader.onload = function(e) {
                console.log("reader done");
                var targets_s = e.target.result;
                targets = JSON.parse(targets_s);
                console.log(targets);
                saveTargets(targets);
                };
            reader.readAsText(file);
        }
    });

    /* Loading playback shots from JSON file */
    $("#shotssrc").change( function(ev) {
        var file = ev.target.files[0];
        console.log(file);
        var reader = new FileReader();
        reader.onload = function(e) {
            var shots_s = e.target.result;
            sessionStorage.setItem("playback_shots", shots_s);                
            };
        reader.readAsText(file);
    });



    // Keypresses
    $(document).keypress(function(event){	
        //console.log("rairairai" + event.which + " " + "2".charCodeAt(0))
        switch (event.which) {
            case "a".charCodeAt(0):
                seekVideo(-0.5, true);
                break;
            case "s".charCodeAt(0):
                playPauseVideo()
                break;
            case  "d".charCodeAt(0):
                seekVideo(0.5, true);
                break;
            case "z".charCodeAt(0): 
                playVideo(1);
                break;
            case "x".charCodeAt(0): 
                playVideo(1/2);
                break;
            case "c".charCodeAt(0):
                playVideo(1/4);
                break;
        }   
    });
    
});
