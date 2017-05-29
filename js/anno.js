

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


addTargetPoint = function(trg, x, y, t, w) {
    var loc = where(trg.t, t);
    trg.t.splice(loc, 0, t);
    trg.x.splice(loc, 0, x);
    trg.y.splice(loc, 0, y);
    trg.width.splice(loc, 0, w);
    
    saveAnnoTargets();
    
}

delTargetPoint = function(trg, loc) {
    trg.x.splice(loc, 1);
    trg.y.splice(loc, 1);
    trg.t.splice(loc, 1);
    trg.width.splice(loc, 1);      
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
            
            var ticon_width = vplayer.offsetWidth * trg.width[loc];
            var ticon_height = vplayer.offsetWidth * trg.width[loc];
                    
            
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
            
            
            // 2016-03 hack
            // convert old rel_width to width array
            // convert old target_type to type
            if (trg.width.constructor != Array) {
                var old_value = trg.rel_width;
                trg.width = new Array(trg.t.length).fill(old_value);
            }
            
            // hack hack
            if (trg.width[0] == undefined) {
                trg.width[0] = 0.2;
            }
            
            /*if (trg.width. == undefined) {
                var old_value = trg.rel_width;
                trg.width = new Array(trg.t.length).fill(old_value);
            }
            */
            if (trg.type == undefined) {
                trg.type = trg.target_type;
            }
           
            html += '<p>';
            html += 'Current target: ' + j + '<button onclick="delAnnoTarget('+ j +'); updateTargetList();">Delete</button>';
            html += '</p>';
            
            var trg_w = 0.2;
            if (trg.width.length > 0) {
                trg_w = trg.width[trg.width.length-1];
            }
            html +='Width: <input size="5" id="target_width" type="text" value="'+ trg_w +'"/><br />'
            
            // " onchange="setCurrentAnnoTargetProperties();"
            
            function isSelected(option) {
                if (option === current_anno_target.type) {
                    return "selected";
                } else {
                    return "";
                }
            }
            
            var description = current_anno_target.description;
            if (description == undefined) { description = ""; }
            
            html +='<textarea id="target_description" onchange="setCurrentAnnoTargetProperties();">'+ description +'</textarea>'
            
            
            html +='<br/>'
            html +='<select id="target_type" onchange="setCurrentAnnoTargetProperties();">';
            
            
            html +='<option value="T" '+ isSelected("T") + ' >Trukki</option>';
            html +='<option value="Tb" '+ isSelected("Tb") + ' >Trukki (bluespot)</option>';
            html +='<option value="Tp" '+ isSelected("Tp") + ' >Trukki (peilissä)</option>';
            html +='<option value="Tbp" '+ isSelected("Tbp") + ' >Trukki (bluespot peilissä)</option>';

            html +='<option value="J" '+ isSelected("J") + ' >Jalankulkija</option>';
            html +='<option value="Jp" '+ isSelected("Jp") + ' >Jalankulkija (peilissä)</option>';
            
            html +='<option value="Y" '+ isSelected("Y") + ' >Ympäristö</option>';
            html +='<option value="Yp" '+ isSelected("Yp") + ' >Ympäristö (peilissä)</option>';

            html +='<option value="nothing" '+ isSelected("nothing") + ' >Empty</option>';            
            html +='<option value="other" '+ isSelected("other") + ' >Other</option>';
            
            html +='<option value="roaduser" '+ isSelected("roaduser") + ' >1 Road user</option>';
            html +='<option value="roaduser_pedestrian" '+ isSelected("roaduser_pedestrian") + ' >1.1 Pedestrian</option>';
            html +='<option value="roaduser_bicycle" '+ isSelected("roaduser_bicycle") + ' >1.2. Bicycle</option>';
            html +='<option value="roaduser_car" '+ isSelected("roaduser_car") + ' >1.3. Car</option>';

            html +='<option value="occlusion" '+ isSelected("occlusion") + ' >2 Occlusion</option>';
            html +='<option value="occlusion_mroad" '+ isSelected("occlusion_mroad") + '>2.1 Merging road</option>';
            html +='<option value="occlusion_mparking" '+ isSelected("occlusion_mparking") + ' >2.2 Merging parking place</option>';
            html +='<option value="occlusion_mpath" '+ isSelected("occlusion_mpath") + ' >2.3 Merging path</option>';
            html +='<option value="occlusion_stoppedveh" '+ isSelected("occlusion_stoppedveh") + ' >2.4 Stopped vehicle</option>';
            html +='<option value="occlusion_busstop" '+ isSelected("occlusion_busstop") + ' >2.5 Bus stop</option>';
            
            
            html +='</select>';
            
            html += "<p>List of target points:</p>"
            html += '<table class="targetPointTable">';
        
            // Show points
            console.log(trg);
            for (var i=0; i<trg.t.length; i++) {  
            
                var t = trg.t[i].toPrecision(3);
                var x = trg.x[i].toPrecision(3);
                var y = trg.y[i].toPrecision(3);
                var w = 0.1;
                if (trg.width[i] != undefined) {
                    w = trg.width[i].toPrecision(2);
                }
                var line = "".concat('<tr><td>'+ (i+1) +'. <button class="targetPointTable" onclick="seekVideo('+t+', false)">'+t+'</button>', 
                                        '<td>' + x + '</td>',
                                        '<td>' + y + '</td>',
                                        '<td><input type="text" class="targetPointTable" id="targetPointSize_'+ i +'" value="'+ w +'" onchange="setCurrentAnnoTargetProperties();"/>',
                                        "<td>",
                                        '<button class="targetPointTable" onclick="delTargetPoint(anno_targets[' + j +'],'+ i +'); updateTargetList();">X</button>',
                                        "</td></tr>");
                html += line;
            }
                
            html += "</table>"
            
            var c1_text = "";
            var c1_checked = "";
            var c2_text = "";
            var c2_checked = "";
            var c3_text = "";
            var c3_checked = "";
            
            console.log(trg.multiple_choices);
            
            // I so need to make this with React or similar...
            if (trg.multiple_choices != undefined) {
                var mcs = trg.multiple_choices.slice();
            
                if (mcs.length > 0) {
                    console.log("1");
                    var c1 = mcs.splice(0, 1)[0];
                    c1_text = c1[0];
                    c1_checked = "";
                    if (c1[1]) { c1_checked = 'checked'; }
                }
                if (mcs.length > 0) {
                    console.log("2");
                    var c2 = mcs.splice(0, 1)[0];
                    c2_text = c2[0];                    
                    c2_checked = "";
                    if (c2[1]) { c2_checked = 'checked'; }
                }
                if (mcs.length > 0) {
                    console.log("3");
                    var c3 = mcs.splice(0, 1)[0];
                    c3_text = c3[0];
                    c3_checked = "";
                    if (c3[1]) { c3_checked = 'checked'; }
                }
            }
            
            // multiple choices
            html += '<p><input type="checkbox" '+ c1_checked +' onchange="setCurrentAnnoTargetProperties();" id="targetMultipleChoice1_Correct" />';
            html += '<input type="text" onchange="setCurrentAnnoTargetProperties();" id="targetMultipleChoice1_Text" value="' + c1_text +'" /></p>';
            
            html += '<p><input type="checkbox" '+ c2_checked +' onchange="setCurrentAnnoTargetProperties();" id="targetMultipleChoice2_Correct" />';
            html += '<input type="text" onchange="setCurrentAnnoTargetProperties();" id="targetMultipleChoice2_Text" value="' + c2_text +'" /></p>';
            
            html += '<p><input type="checkbox" '+ c3_checked +' onchange="setCurrentAnnoTargetProperties();" id="targetMultipleChoice3_Correct" />';
            html += '<input type="text" onchange="setCurrentAnnoTargetProperties();" id="targetMultipleChoice3_Text" value="' + c3_text +'" /></p>';
            
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
    
    // save type
    current_anno_target.type = type;
    
    // save description
    current_anno_target.description = $("#target_description").val();

    // save multiple choice
    var tmc1_text = document.getElementById("targetMultipleChoice1_Text").value;
    var tmc2_text = document.getElementById("targetMultipleChoice2_Text").value;
    var tmc3_text = document.getElementById("targetMultipleChoice3_Text").value;
    var tmc1_correct = document.getElementById("targetMultipleChoice1_Correct").checked;
    var tmc2_correct = document.getElementById("targetMultipleChoice2_Correct").checked;
    var tmc3_correct = document.getElementById("targetMultipleChoice3_Correct").checked;
    

    
    var mcs = [];
    if (tmc1_text != "") { mcs.push( [tmc1_text, tmc1_correct] ); }
    if (tmc2_text != "") { mcs.push( [tmc2_text, tmc2_correct] ); }
    if (tmc3_text != "") { mcs.push( [tmc3_text, tmc3_correct]); }
    
    current_anno_target.multiple_choices = mcs;
    
    // TODO: 
    // hmm, this updates all the sizes to the same: it's ok with SA Game and when
    // there is only a singel point, but otherwise it makes it impossible to have 
    // variable width targets... 
    for (i=0; i<current_anno_target.t.length; i++) {
        var w = Number.parseFloat($("#targetPointSize_"+ i).val());
        current_anno_target.width[i] = w;
    }
    
    

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
        
        var target_width = Number.parseFloat($("#target_width").val());
        
        addTargetPoint(current_anno_target, x, y, ctime, target_width)
        
        updateDisplay();
    }
}

function updateDisplay() {
        updateTargetIcon();
        updateVideoPositionIndicator();
        updateTargetList();
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



    //Keypresses
    $(document).keypress(function(event){	
        if (event.keyCode == 9) {
            playPauseVideo();
        }
        
        /*switch (event.which) {
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
           
        }  */ 
    })
    
});
