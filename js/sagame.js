
/*
    Specify Dexie database
*/
var db = new Dexie("Freebike.SAGame");

db.version(5).stores({ // in order to prevent errors
    
    answers: "++id, player_id, src, src_stop_time, query_id, box_id, query_started_realt, answer_latency, answer, target_id, target_type, target_x, target_y", 
    markers: "++id,real_t,marker_id,top,left,width,height,video_left, video_right, video_top, video_bottom,[real_t+marker_id]",
    expevents: "++id,player_id,session_id,src,event,t,real_t,[player_id+src]"
});


//~ db.version(7).stores({
    
    //~ answers: "++id, player_id, session_id, src, src_stop_time, query_id, box_id, query_started_realt, answer_latency, answer, target_id, target_type, target_x, target_y", 
    //~ markers: "++id,real_t,marker_id,top,left,width,height,video_left, video_right, video_top, video_bottom,[real_t+marker_id]",
    //~ expevents: "++id,player_id,session_id,src,event,t,real_t,[player_id+src]"
//~ }).upgrade(function(t) {
    //~ return t.modify.toCollection().modify(function(ans) {
        //~ ans.session_id = 0;
    //~ });
//~ });



function Answer(player_id, src, src_stop_time, query_id, box_id, query_started_real_t, answer_latency, answer, target_id, target_type, target_x, target_y) {
    /*
	Answer class represent answers and related information.
    */
    this.player_id = player_id;     
    this.src = src;
    this.src_stop_time = src_stop_time;
    this.query_id = query_id;
    this.box_id = box_id;
    this.query_started_real_t = query_started_real_t;
    this.answer_latency = answer_latency;
    this.answer = answer;
    this.target_id = target_id;
    this.target_type = target_type;
    this.target_x = target_x;
    this.target_y = target_y;
	
}

function ExpEvent(src, event, t) {
    this.player_id = sessionStorage.getItem("Freebike.SAGame.player_id");
    this.session_id = sessionStorage.getItem("Freebike.SAGame.session_id");
    
    this.src = src;
    this.t = t;
    this.real_t = Date.now();
    this.event = event;

}


Answer.prototype.save = function() {
    db.answers.put(this)
    .then( function(e) { 
        //console.log("Answer saved." + this + " " + e);
        })
    .catch( function(e) { console.log("Problems saving answer! " + e);} );
}


/* 
    We specify how Marker.save function works in SA game. 
*/
Marker.prototype.save = function() {
    db.markers.put(this)
    .then( function(e) { 
        // console.log("Marker position saved." + this + " " + e);
        })
    .catch( function(e) { console.log("Problems saving markers! " + e);} );
}

ExpEvent.prototype.save = function() {
    db.expevents.put(this)
    .then( function(e) { 
        // console.log("ExpEvent saved." + this + " " + e);
        })
    .catch( function(e) { console.log("Problems saving ExpEvent! " + e);} );
}




db.answers.mapToClass(Answer);
db.markers.mapToClass(Marker);
db.expevents.mapToClass(ExpEvent);
db.open();


function VideoBuffer() {
    this.videoURLs = new Map();
}

VideoBuffer.prototype.waitVideo = function(src, callback) {
    
    this.buffer(src); // can do this because multiple requests has been blocked
    
    if (this.videoURLs.has(src) && this.videoURLs.get(src) != 'loading') {
        var url = this.videoURLs.get(src);
        callback(url);
        this.videoURLs.delete(src);
    } else {
        var self = this;
        setTimeout(function() { self.waitVideo(src, callback); }, 1000);
        console.log("Waiting video "+ src + " for next 1 s...")
    }    
}

VideoBuffer.prototype.buffer = function(src) {
    var self = this;
    
    var req = new XMLHttpRequest();
    req.open('GET', src, true);
    req.responseType = 'blob';

    req.onload = function() {
       // Onload is triggered even on 404
       // so we need to check the status code
       if (this.status === 200) {
          var videoBlob = this.response;
          var videoURL = URL.createObjectURL(videoBlob); // IE10+
          // Video is now downloaded
          self.videoURLs.set(src, videoURL);
       }
    }
    req.onerror = function() {
       console.log("Videobuffer: loading failed");
    }
    
    // load if it is not already here
    if (! this.videoURLs.has(src)) {
        this.videoURLs.set(src, 'loading'); // prevent sending multiple requests
        req.send(); 
    }
}

/*
VideoBuffer.prototype.getVideo(id) {

    var promise = new Promise(function(resolve, reject) {
        // do a thing, possibly async, then…
        /* if (video available) {
            resolve
            } else { 
                preload
            }
        
      if (/* everything turned out fine ) {
        resolve("Stuff worked!");
      }
      else {
        reject(Error("It broke"));
      }
    });

}
*/


/*
    Global variables for the game
*/

var SAGAME = {};
// defaults, can be overriden in the html
SAGAME.sagameStyle = 'yesno';
SAGAME.fastResponseLimit = 999;
SAGAME.showMarkers = 1;
SAGAME.showClipId = 1;
SAGAME.showExitGameButton = 0;
SAGAME.calibInterval = 16;
SAGAME.clipIdLength = 3; // hom many characters from the beginning will be shown as clip id
SAGAME.CLIPSETS = null;
SAGAME.CLIPPATH = null;
SAGAME.TARGETS = null;

SAGAME.query_id = -1; // to hold the current position in the query data

SAGAME.currentClipset = null;
SAGAME.videoBuffer = new VideoBuffer();
SAGAME.currentGameName = '';
SAGAME.currentPoints = 0;
SAGAME.currentMaxPoints = 0;
SAGAME.currentGameCompleted = 0;
SAGAME.currentQueries = null; // to hold query data
SAGAME.showQueryTimeout = null; // global timeout to for query firing 
    
var test_queries; // to hold query data

var query_box_present_color = 'yellow';
var query_started_realt = null; // global var which is used when registering not presence (should be something neater...)




var pointCounter = 0; // should be replaced by SAGAME attribute

var PERF_video_play_called = 0;
var PERF_video_paused = 0;



function annoTargets2TestQuery(clipname, all_targets) {
	var cur_trgs = all_targets[clipname];
	
    console.log(clipname);
    //console.log(all_targets);
    
	if (cur_trgs === undefined) {
		alert("No targets with clipname: " + clipname);
        return;
	}
	    
    // annotation may have multiple time-location points: SAGame uses the last one to define the
    // stop time, but e.g. eye tracking analyses may use all of them
	var stop_time = cur_trgs[0].t.slice(-1).pop(); 
		
	var query = {clip : clipname, 
                stop_time : stop_time, 
                items : []};
	
	for (var i=0; i<cur_trgs.length; i++) {
		var ct = cur_trgs[i];
		
		console.log(ct.t);
		if (stop_time.toFixed(1) !== ct.t.slice(-1).pop().toFixed(1)) {
			console.log("annoTargets2TestQuery receives anno targets with varying last t. Sorry, but it cannot understand what to do now.");
		} else {
			
			query.items.push( {target_id: ct.id, 
                                type: ct.type,
                                description: ct.description,
                                x : ct.x.slice(-1).pop(), // select always the last point for this game: others are for analysis
                                y : ct.y.slice(-1).pop(),
                                multiple_choices : ct.multiple_choices } ); 
		}
		
	}
	//console.log('query', query);
	
	return query;
}


function clearQueries() {
    /* 
        This function clears the response elements from the screen.
    */
	var parent = document.getElementById("screen");
	var query_boxes = parent.getElementsByClassName("query_box");
	
	for (var i=query_boxes.length; i--; i >= 0) {
		var node = query_boxes.item(i);
		node.parentNode.removeChild(node);
	}		
	
	var query_feedbacks = parent.getElementsByClassName("query_feedback");
	for (var i=query_feedbacks.length; i--; i >= 0) {
		var node = query_feedbacks.item(i);
		node.parentNode.removeChild(node);
	}    

	var elems = parent.getElementsByClassName("query_multiple_choice");
	for (var i=elems.length; i--; i >= 0) {
		var node = elems.item(i);
		node.parentNode.removeChild(node);
	}    

    
}

function checkAnswers() {

    if (SAGAME.sagameStyle == 'mc_comment') {
        checkAnswersMultipleChoice();
    } else if (SAGAME.sagameStyle == 'selectone') {
        checkAnswersSelectOne();
    } else { // yesno
        checkAnswersYesNo();
    }
    
}

function checkAnswersMultipleChoice() {
    var query_id = SAGAME.query_id;
    var query = SAGAME.currentQueries[query_id];
    var had_miss = false;
    var pointGain = 0;

    for (var box_id=0; box_id<query.items.length; box_id++) {
        var qitem = query.items[box_id];
        var query_box_id = "query_box_" + query_id + '_' + box_id;
        //var query_feedback_id = "query_feedback_" + query_id + '_' + box_id;
        var qMCid = "query_mc_" + query_id + '_' + box_id;
        
        
        var qLocation = document.getElementById(query_box_id);
        var qMultChoice = document.getElementById(qMCid);
        
        
        $("#"+ qMCid).show();
               
        var selected = $('input[name=mc_'+ query_id +'_'+ box_id +']:checked', '#'+ qMCid).val()
        

        var correctOption = 'empty';
        for (var i=0; i<qitem.multiple_choices.length; i++) {
            if (qitem.multiple_choices[i][1] == 1) {
                correctOption = i;
            }
        }

        var qMultChoiceOption = document.getElementById(qMCid + '_option'+ correctOption);
        //qMultChoiceOption.style.textDecoration = "underline";
        qMultChoiceOption.style.backgroundColor = "green";
        
        
        if (qitem.multiple_choices[selected][1] == 1) {
            qLocation.style.borderColor = "green";
            qLocation.style.borderWidth = "3px";
            
            qMultChoiceOption = document.getElementById(qMCid + '_option'+ selected);
            qMultChoiceOption.style.backgroundColor = "green";
            
            console.log("correct");
            
        } else {
            qLocation.style.borderColor = "red";
            qLocation.style.borderWidth = "3px";
            
            qMultChoiceOption = document.getElementById(qMCid + '_option'+ selected);
            qMultChoiceOption.style.backgroundColor = "red";
            
            console.log("incorrect");
            
            had_miss = true;

        }
    }
    
    if (had_miss) {
        $("#missplayer")[0].play();
    } else {
        $("#targethitplayer")[0].play();
    }
        
    console.log(pointCounter);
    console.log(pointGain);
    pointCounter += pointGain; // replace with SAGAME attribute
    
    SAGAME.currentPoints += pointGain;
    
    if (pointCounter < 0) {
        pointCounter = 0;
        SAGAME.currentPoints = 0;
    }
    
    //$(points)[0].style.width = (1 + 20*pointCounter) + "px";
    $("#points").html ('' + pointCounter);
	
    
    $("#videoMask").hide();
	$("#checkbutton").hide();
	$("#nextbutton").show();
	
	
}


function checkAnswersYesNo() {
    /**
        Check answers and show feedback in the simple yes/no case.
    */
    var query_id = SAGAME.query_id;
    
    var query = SAGAME.currentQueries[query_id];

    
    var had_miss = false;
    var pointGain = 0;
    

    
    for (var box_id=0; box_id<query.items.length; box_id++) {
        var qitem = query.items[box_id];
        var query_box_id = "query_box_" + query_id + '_' + box_id;
        var query_feedback_id = "query_feedback_" + query_id + '_' + box_id;
        
        var qbox = document.getElementById(query_box_id);
        var status = getQueryBoxStatus(qbox);
        if (status == 'notpresent') {
            // we register the status of all the notpresents here so that we get the information
            // however, the present ones shoud not be registered here because their status is 
            // registered when the participat hitted the location. this way we can use their last timstamp as
            // the response time in yes-no -query
            registerPresence(query, query_id, box_id, "notpresent", query_started_realt);
        }
        
        
        console.log(SAGAME.description);
        
        if (status == 'present') {
            //var qbt = qbox.getElementsByClassName("query_box_target").item(0);
            //qbt.style.backgroundColor = 'transparent';
            qbox.style.backgroundColor = 'transparent';
        }
        
        if ((qitem.type != 'nothing') && (status == 'notpresent')){
            had_miss = true;
            
            qbox.style.borderColor = "red";
            qbox.style.borderWidth = "3px";
            //qbox.innerHTML = "<p>-5</p>";
            
            
            
            if (SAGAME.feedback == 'description') {
                pointGain += -1;

                var txt = qitem.description + "<br /> Menetit pisteen." ;
                
                $("#"+ query_feedback_id).html(txt);
                $("#"+ query_feedback_id).show(); 
                
            } else {
            
                pointGain += -5;

                var txt = "Voi ei! Jäi huomaamatta!<br /> -5";
                if (qitem.type == 'occlusion') {
                    txt = "Voi ei!<br /> Näköeste jäi huomaamatta!<br /> -5";
                }
                $("#"+ query_feedback_id).html(txt);
                $("#"+ query_feedback_id).show(); 
            }
        }
        
        if ((qitem.type != 'nothing') && (status == 'present')){
            //var qbt = qbox.getElementsByClassName("query_box_target").item(0);
            //qbt.style.borderColor = "green";
            //qbt.style.borderWidth = "3px";
            //qbt.innerHTML = "<p>+5</p>";
                            
            qbox.style.borderColor = "green";
            qbox.style.borderWidth = "3px";
            //qbox.innerHTML = "<p>+5</p>";

            if (SAGAME.feedback == 'description') {
                pointGain += 1;
                
                var txt = "Hyvin havaittu! Sait pisteen. <br />"+ qitem.description;
         
                $("#"+ query_feedback_id).html(txt);
                $("#"+ query_feedback_id).show(); 
   
            } else {
                pointGain += 5;
                
                var txt = "Hyvin havaittu! <br /> +1" ;
                if (qitem.type == 'occlusion') {
                    txt = "Hyvin havaittu näköeste!<br /> +1";
                }
            
                $("#"+ query_feedback_id).html(txt);
                $("#"+ query_feedback_id).show(); 
   
            }
        }
        
        if ((qitem.type == 'nothing') && (status == 'notpresent')){
            //var qbt = qbox.getElementsByClassName("query_box_target").item(0);
            //qbt.style.borderColor = "gray";
            //qbt.style.borderWidth = "3px";
            //qbt.innerHTML = "<p>+1</p>";
            
            qbox.style.borderColor = "gray";
            qbox.style.borderWidth = "3px";
            //qbox.innerHTML = "<p>+1</p>";
            
            if (SAGAME.feedback == 'description') {
                //var txt = "+1" ;
                
                //$("#"+query_feedback_id).html(txt);
                //$("#"+query_feedback_id).show();
                
            } else {
            
                pointGain += 0;
                
                $("#"+query_feedback_id).html("Hyvä!<br/> Ei ollut mitään etkä valinnut sitä.<br />+1");
                $("#"+query_feedback_id).show();     
            }
        } 
        
        if ((qitem.type == 'nothing') && (status == 'present')){
            // var qbt = qbox.getElementsByClassName("query_box_target").item(0);
            
            if (SAGAME.feedback == 'description') {
                $("#"+query_feedback_id).html("Hyvä yritys!")
                $("#"+query_feedback_id).show();
            } else {
                
                $("#"+query_feedback_id).html("Tyhjä!<br/> Jos jätät valitsematta sellaiset missä ei ole mitään niin saat yhden pisteen.")
                $("#"+query_feedback_id).show();
            }
        }             
        
    }
    
    if (had_miss) {
        $("#missplayer")[0].play();
        
    } else {
        $("#targethitplayer")[0].play();
    }
    
    // remove as obsolate? $(videoplayer)[0].style.display = "block";
    
    console.log(pointCounter);
    console.log(pointGain);
    pointCounter += pointGain;
    if (pointCounter < 0) {
        pointCounter = 0;
    }
    
    //$(points)[0].style.width = (1 + 20*pointCounter) + "px";
    $("#points").html ('' + pointCounter);
	
    
    $("#videoMask").hide();
	$("#checkbutton").hide();
	$("#nextbutton").show();
	
	
}


function checkAnswersSelectOne() {
    /**
        Check answers and show feedback when you have to select one. 
        Currently this is exactly lie yes-no, but this may change. 
    */
    var query_id = SAGAME.query_id;
    
    var query = SAGAME.currentQueries[query_id];

    
    var had_miss = false;
    var pointGain = 0;
    var answerObj = null;

    
    for (var box_id=0; box_id<query.items.length; box_id++) {
        var qitem = query.items[box_id];
        var query_box_id = "query_box_" + query_id + '_' + box_id;
        var query_feedback_id = "query_feedback_" + query_id + '_' + box_id;
        
        var qbox = document.getElementById(query_box_id);
        var status = getQueryBoxStatus(qbox);
        
        
        // we register the status of all the locations here
        answerObj = registerPresence(query, query_id, box_id, status, query_started_realt);
        console.log("answer_latency" + answerObj.answer_latency);
        
        if (status == 'present') {
            //var qbt = qbox.getElementsByClassName("query_box_target").item(0);
            //qbt.style.backgroundColor = 'transparent';
            qbox.style.backgroundColor = 'transparent';
        }
        
        if ((qitem.type != 'nothing') && (status == 'notpresent')){
            had_miss = true;
            
            qbox.style.borderColor = "red";
            qbox.style.borderWidth = "3px";
            
            if (SAGAME.feedback == 'description') {
                var txt = "";
                if (answerObj.answer_latency < SAGAME.fastResponseLimit) {
                    txt += "Nopeasta mutta väärästä vastauksesta menetit kaksi pistettä!";
                    pointGain += -2;
                } else {
                    txt += "Menetit pisteen!";
                    pointGain += -1;
                }
                txt += "<br />" + qitem.description;
                
                $("#"+ query_feedback_id).html(txt);
                $("#"+ query_feedback_id).show(); 
                
            } else {
                console.log("Not implemented without description.");
            }
        }
        
        if ((qitem.type != 'nothing') && (status == 'present')){
                            
            qbox.style.borderColor = "green";
            qbox.style.borderWidth = "3px";
            
            if (SAGAME.feedback == 'description') {
                var txt = "";
                if (answerObj.answer_latency < SAGAME.fastResponseLimit) {
                    txt += "Hyvin havaittu! Nopeasta vastauksesta kaksi pistettä.";
                    pointGain += 2;
                } else {
                    txt += "Hyvin havaittu! Sait pisteen.";
                    pointGain += 1;
                }
                
                txt += "<br />"+ qitem.description;

                $("#"+ query_feedback_id).html(txt);
                $("#"+ query_feedback_id).show(); 
   
            } else {
                 console.log("Not implemented without description.");
            }
        }
        
        if ((qitem.type == 'nothing') && (status == 'notpresent')){
            
            qbox.style.borderColor = "gray";
            qbox.style.borderWidth = "3px";
            //qbox.innerHTML = "<p>+1</p>";
            
            if (SAGAME.feedback == 'description') {
                // do not display any feedback
            } else {
                console.log("Not implemented without description.");
            }
        } 
        
        if ((qitem.type == 'nothing') && (status == 'present')){
            
            if (SAGAME.feedback == 'description') {
                $("#"+query_feedback_id).html("Hyvä yritys!")
                $("#"+query_feedback_id).show();
            } else {
                console.log("Not implemented without description.");
            }
        }             
        
    }
    
    if (had_miss) {
        $("#missplayer")[0].play();
        
    } else {
        $("#targethitplayer")[0].play();
    }
    
    // setup the points

    //SAGAME.currentMaxPoints += 1; // This is simple, for each video you can get one point in select-one kind of game
    
    SAGAME.currentMaxPoints += 2; // This is simple, for each video you can get two or one points 
    
    console.log(pointGain);
    SAGAME.currentPoints += pointGain;
    if (SAGAME.currentPoints < 0) {
        SAGAME.currentPoints = 0;
    }
    
    updatePoints(pointGain);

    
    $("#videoMask").hide();
	$("#checkbutton").hide();
	$("#nextbutton").fadeIn(500);
	
	
}




function downloadDexieTable(tableName) {
    console.log("downloadDexieTable called " + tableName);
    
    db.table(tableName).toArray().then( function(rows) {
        
        var jsonStr = JSON.stringify(rows);
        
        console.log(jsonStr);
        
        var blob = new Blob([jsonStr], {type : "text/plain;charset=utf-8"});
        saveAs(blob, tableName + ".json");
    }).catch( function(e) { console.log("Error retrieving" + e); });
    
}


//////////// Server communication functions, start

function logToServer(player_id) {
    /**
     * This function will json the database contents and send them to the 
       SAGAME.LOGURL via AJAX post call if the url is defined. It does not 
       care what happens after that. 
     */    
    if (SAGAME.LOGURL) {
        
        db.answers.where("player_id").equals(player_id).toArray().then( function(playerAnswers) {

            db.expevents.where("player_id").equals(player_id).toArray().then( function(playerExpevents ) {
                
                var data = { 'player_id': player_id, 
                             'answers': playerAnswers,
                             'expevents' : playerExpevents }
                var dataJSON = JSON.stringify(data); 
                postJSONtoServer(dataJSON, SAGAME.LOGURL);
            });
            
        }).catch( function(e) { console.log("Error sending" + e); });
    }
}

function getScoresFromServer(player_id) {
    /*
        Retrieve player's scores from the server and store them to localStorage.
    */
    console.log("player_id: "+ player_id);
    
    var json_file = 'scoresdata/scores_'+ player_id +'.json';
    console.log(json_file);
    
    $.ajaxSetup({ cache: false }); // this is important!
    var req = $.getJSON(json_file, function(scoresJSON) {

        console.log(scoresJSON);
        localStorage.setItem("Freebike.SAGame.scores", JSON.stringify(scoresJSON));    
    
    }).fail(function(err) {
        console.log(err);
        console.log("Loading scores with AJAX failed.");
        
        scoresTmpl = {'player_id' : player_id}
        localStorage.setItem("Freebike.SAGame.scores", JSON.stringify(scoresTmpl) ); // for storing the scores
        
    });
    return req;
}

//////////// Server communication functions, start






function loadClipsetsFrom(json_file) { 
    /**
     * Load clipsets from json file.
     */    
    var req = $.getJSON(json_file, function(data) {
        SAGAME.CLIPSETS = data.CLIPSETS;
        SAGAME.CLIPPATH = data.CLIPPATH;
    }).fail(function(err) {
        console.log(err);
        console.log("Loading clipsets with AJAX failed. Fallback to offline version. Will fail if they are not defined.");
        SAGAME.CLIPSETS = OFFLINE_CLIPSETS;
        SAGAME.CLIPPATH = OFFLINE_CLIPPATH;
    });
    return req;
}


function loadTargetsFrom(json_file) { 
    /**
     * Load target annotations from json file.
     */
    var req = $.getJSON(json_file, function(data) {
        SAGAME.TARGETS = data;
    }).fail(function(err) {
        console.log(err);
        console.log("Loading targets with AJAX failed. Fallback to offline version.");
        SAGAME.TARGETS = OFFLINE_TARGETS;
    });
    return req;
}



function loadQueries(videoset) {
    /*
        Parse targets descriptions and convert them as "queries".
    */
	var all_targets = SAGAME.TARGETS;
	
    
    var cliplist = videoset;
    console.log("cliplist");
    console.log(cliplist);
    
	var test_queries = [];
	
	for (var i=0; i<cliplist.length; i++) {
		var clipname = cliplist[i];
        try {
            var query = annoTargets2TestQuery(clipname, all_targets);
            test_queries.push(query);
        } catch (e) {
            alert("Hups! Ongelmia pelidatan latauksessa kanssa videossa: "+ clipname); 
        }
	}
	return test_queries;
}
	



function proceedIfAllAnswered() {
	/*
		USED with registerIdentity:
		If the query banner do not have any visible query boxes == all answered, then proceed to the next test clip.
	
	*/
	var parent = document.getElementById("screen");
	
	var query_boxes = parent.getElementsByClassName("query_box");
	var all_answered = true;
	
	for (var i=0; i<query_boxes.length; i++) {
		var qbox = query_boxes.item(i);
		
		if (qbox.style.display == "block") {
			all_answered = false;
			break;
		}
	}
	
	console.log('all_answered' + all_answered);
		
	if (all_answered) {
		
		clearQueries();
		startNextClip();
		console.log("rai");
	}
}
	
//~ function registerIdentity(query_id, box_id, answer, query_started_realt) {
	//~ /*
		//~ Registers which object the query box represents.
	//~ */
	//~ var player_id = sessionStorage.getItem("player_id");
	//~ var answer_latency = (Date.now() - query_started_realt) / 1000;
	//~ var answer = { player_id : player_id,
				   //~ query_id : query_id,
				   //~ query_started_realt : query_started_realt,
				   //~ answer_latency : answer_latency,
				   //~ answer : answer};
				   
	//~ test_answers.push(answer);
	
	//~ proceedIfAllAnswered();
//~ }


function registerPresence(query, query_id, box_id, answer, query_started_realt) {
	/* 
		Registers if a query box is labeled as having something.
	*/
	var query_items = query.items;
	var query_box_id = "query_box_" + query_id + '_' + box_id;
	var player_id = sessionStorage.getItem("Freebike.SAGame.player_id");
	var answer_latency = (Date.now() - query_started_realt) / 1000;
	
    var ansObj = new Answer(sessionStorage.getItem("Freebike.SAGame.player_id"),
                            query.clip,
                            query.stop_time, 
                            query_id,
                            box_id, 
                            query_started_realt, 
                            answer_latency, 
                            answer, 
                            query_items[box_id].target_id, 
                            query_items[box_id].type, 
                            query_items[box_id].x, 
                            query_items[box_id].y);
                            
    ansObj.save();
    return ansObj;
}




function createQueryLocation(locData, query_id, box_id) {
    /* 
       Creates elements to show answer locations (the circles) and positions the elements. 
    */
  	var queryBoxTmpl = document.getElementById("query_box_template");
	var queryFeedbackTmpl = document.getElementById("query_feedback_template");
    var screen = document.getElementById("screen");
	var vplayer = document.getElementById("videoplayer");
    
    // create circle (box) elements
    var query_box_id = "query_box_" + query_id + '_' + box_id;
    var qbox = queryBoxTmpl.cloneNode(true);
    qbox.id = query_box_id;
    
    // create feedback element
    var query_feedback_id = "query_feedback_" + query_id + '_' + box_id;        
    var qfeedback = queryFeedbackTmpl.cloneNode(true);
    qfeedback.id = query_feedback_id;        
    
    // add them to the screen element
    screen.appendChild(qbox);  
    screen.appendChild(qfeedback);  
    
    // show the box, hide the feedback so far
    qbox.style.display = "block";
    qfeedback.style.display = "none";
    
    // relative sizing of boxes: added 2017-05-11
    var circleDiameter = 0.19 * vplayer.offsetWidth;
    qbox.style.width = circleDiameter + "px"; 
    qbox.style.height = circleDiameter + "px"; 
    
    // positioning
    var clientxy = videoToClient(vplayer, locData.x, locData.y);
    var centering =	[qbox.offsetWidth * 0.5, qbox.offsetHeight * 0.5];
    
    qbox.style.top = (clientxy[1] - centering[1]) + "px"; 
    qbox.style.left = (clientxy[0] - centering[0]) + "px";
    
    // feedback position either below or above, depending on the location
    var feedbackOffset = - circleDiameter;
    if (clientxy[1] < circleDiameter) {
        feedbackOffset = 0.6 * circleDiameter;
    }
    
    //qfeedback.style.top = (clientxy[1] - centering[1] + feedbackOffset) + "px"; 
    //qfeedback.style.left = (clientxy[0] - centering[0]) + "px";
    
    qfeedback.style.top = (clientxy[1] + feedbackOffset) + "px"; 
    qfeedback.style.left = (clientxy[0] - centering[0]) + "px";
    
    
    return qbox;
}


function showQuery(query) {
    /**
        This functions shows one query (=locations when the video is stopped) to the player.
    */
	console.log("showQuery called with:");
    console.log(query);
    console.log(query.items);

    var query_id = SAGAME.query_id;
    
    // Setup of variables 
    var query_items = query.items;
	
	var vplayer = document.getElementById("videoplayer");
	var nbutton = document.getElementById("nextbutton");
	var screen = document.getElementById("screen");
	
    var screen = document.getElementById("screen");
	
    // Let's make sure the video is paused and then we record that event
	vplayer.pause();
    query_started_realt = Date.now();
	var ev = new ExpEvent(query.clip, 'queryStarted', vplayer.currentTime);
    ev.save();
    
    // Now for each target, we make the circle visible and setup callbacks
    
	for (var box_id=0; box_id<query_items.length; box_id++) {
		
		var locationData = query_items[box_id];
        var qbox = createQueryLocation(locationData, query_id, box_id);
        
        // REFACTOR THIS: 
        // Create this so that you can just plug different functions in depending on the query/feedback style 
        // The essential this is that you need to have different callback for each style. 
        if (SAGAME.sagameStyle == 'mc_comment') {
            console.log("register mc_comment choice");
            
            // Here we setup the callbacks
            function clickCircleCallback(locationData, query_id, box_id) {
                return function() { 
                    
                                // this is the id for multiple choice element
                                var qMCid = "query_mc_" + query_id + '_' + box_id;
                    
                                // setup multiple choice selection
                    
                                if (document.getElementById(qMCid)) { // create it if id does not exist
                    
                                    var queryMultipleChoiceTmpl = document.getElementById("query_multiple_choice_template");
                                    var qMC = queryMultipleChoiceTmpl.cloneNode(true);
                                    qMC.id = qMCid;
                                
                                    screen.appendChild(qMC);
                                    
                                    qMC.style.top = (clientxy[1] - centering[1] + 200) + "px"; 
                                    qMC.style.left = (clientxy[0] - centering[0]) + "px";
                                    qMC.style.display = "none";
                                
                                
                                    if (locationData.multiple_choices == undefined) {
                                        alert("Multiple choices have not been defined for this target");
                                    } else {
                                        var id_0 = qMCid + '_option0';
                                        var id_1 = qMCid + '_option1';
                                        var id_2 = qMCid + '_option2';
                                        
                                        var radioGroup = 'mc_'+ query_id + '_'+ box_id;
                                        
                                        var html = "";
                                        html += '<p id="'+ id_0 +'"><input type="radio" name="'+ radioGroup +'" value="0" />' + locationData.multiple_choices[0][0] + '</p>';
                                        html += '<p id="'+ id_1 +'"><input type="radio" name="'+ radioGroup +'" value="1" />' + locationData.multiple_choices[1][0] + '</p>';
                                        html += '<p id="'+ id_2 +'"><input type="radio" name="'+ radioGroup +'" value="2"/>' + locationData.multiple_choices[2][0] + '</p>';
                                        qMC.innerHTML = html  
                                        
                                        // make it hide when selected
                                        function hideMultipleChoicesCallback(query_id, box_id) {
                                            return function() {
                                                var id = "#query_mc_"+ query_id +"_"+ box_id;
                                                console.log(id);
                                                $(id).hide();
                                            }
                                        }
                                        $("#"+ id_0).change( hideMultipleChoicesCallback(query_id, box_id));
                                        $("#"+ id_1).change( hideMultipleChoicesCallback(query_id, box_id));
                                        $("#"+ id_2).change( hideMultipleChoicesCallback(query_id, box_id));
                                        
                                    }
                                }
                    
                                // let the circle change colour
                                var status = toggleQueryBox(query_id, box_id); 
                                
                                // show it, it hides when some of the elements is selected
                                $("#"+ qMCid).show(); 

                                //console.log(qitem.multiple_choices);
                                }
                            }
                            
            qbox.addEventListener("click", clickCircleCallback(locationData, query_id, box_id), false);
            $("#checkbutton").show();

        } else if (SAGAME.sagameStyle == 'selectone') { // selectone
            
            // Here we setup the callbacks
            function makeCallbackTB(qi, q_id, b_id) {
                return function() { 
                                    var status = toggleQueryBox(q_id, b_id); 
                                    // the first hit is the answer, so we proceed immediately to the checkAnswers
                                    
                                    // we record this for completeness: it will be easier to calculate "pondering time"
                                    var query = SAGAME.currentQueries[SAGAME.query_id];
                                    var ev = new ExpEvent(query.clip, 'answerGiven', -1); 
                                    ev.save();
                                    
                                    checkAnswers();
                                    
                                }
                            }
            
            var query_box_id = "#query_box_" + query_id + '_' + box_id;
            $(query_box_id).one("click", makeCallbackTB(locationData, query_id, box_id));
                            
            // qbox.addEventListener("click", makeCallbackTB(locationData, query_id, box_id), false);
            
            /* // to visualize fast response limit
            var query_box_id = "query_box_" + query_id + '_' + box_id;
            $(query_box_id).hide();                           
            $(query_box_id).fadeIn(SAGAME.fastResponseLimit);
            */

                        
        } else { // yesno
                
            // Here we setup the callbacks
            function makeCallbackTB(qi, q_id, b_id) {
                return function() { 
                                    //console.log("query", query, q_id)
                                    //console.log(query.items[b_id])
                    
                                    //if ((query.items[b_id].type != 'nothing') && (status == 'present')) {
                                    //    console.log("Correct selection!");
                                    //} else {
                                    //    console.log("False positive!");
                                    //}
                    
                                    // let the circle change its colour
                                    var status = toggleQueryBox(q_id, b_id); 
                                    // register every tap
                                    registerPresence(query, q_id, b_id, status, query_started_realt); 
                                }
                            }
                        
            qbox.addEventListener("click", makeCallbackTB(locationData, query_id, box_id), false);
        
            $("#checkbutton").show();
        }
    }

	showVideoMask();
    
	
}

function showVideoMask() {
    /*
        Video mask hides the video still image while a query is presented. 
    */
    $("#videoMask").show();

    var tl = videoToClient($(videoplayer)[0], 0, 0);
    var tr = videoToClient($(videoplayer)[0], 1, 0);
    var bl = videoToClient($(videoplayer)[0], 0, 1);
    var br = videoToClient($(videoplayer)[0], 1, 1);
  
    // markers are place outside the video screen
    $("#videoMask").offset({top: tl[1], left: tl[0]});
    $("#videoMask").width( tr[0] - tl[0] );
    $("#videoMask").height( br[1] - tl[1] );
}


	 




function playVideo() {

    
    function prepare() {
        
        // this is helper functions which clears old things away and shows mask
        hideMarkers();
        $("#nextbutton").hide();
        $("#videoplayer").hide();
        
        $("#currentvideo")[0].style.display = 'block';
        
        // for some reason IE11 does not show them with jqeury show()
        $("#points")[0].style.display = 'block'; 
  
        if (SAGAME.showExitGameButton) {
            $("#exitGameButton")[0].style.display = 'block'; 
        }
        
        // showVideoMask(); // this does not only show it but positions it
        
        clearQueries(); 

    }
    
    function preloadVideo(videoElement, src, callWhenReady) {
        // used to force load the video before starting
        
        var req = new XMLHttpRequest();
        req.open('GET', src, true);
        req.responseType = 'blob';

        req.onload = function() {
           // Onload is triggered even on 404
           // so we need to check the status code
           if (this.status === 200) {
              var videoBlob = this.response;
              var vid = URL.createObjectURL(videoBlob); // IE10+
              // Video is now downloaded
              // and we can set it as source on the video element
              videoElement.src = vid;
              showVideoMask();
               
              $("#videoLoadingMsg").hide();
              callWhenReady();
           }
        }
        req.onerror = function() {
           // Error
            $("#videoLoadingMsg").html("Loading video failed! Please reload the page.");
           console.log("Video loading failed");
        }
        req.send();
        
        $("#videoLoadingMsg").show();
       
    }
    
    
    
    
    function run() {
        
    
        var query = SAGAME.currentQueries[SAGAME.query_id];
        
        var src = SAGAME.CLIPPATH + query.clip;
        // this will be used to check that the timeout function does not show queries when changing videos
        
        console.log(query);
        
        
        $("#videoplayer").off("playing");              
        $("#videoplayer").bind('playing', function() {
            // This is called ONCE after the video has started playing.
            // Here we set showQueryTimeout to show the queries.
            
            // There is a short latency (100-200 ms) before the video really starts 
            // playing after calling play. Therefore it is better to wait until the first
            // playing event before setting the timeout. 
            
            // If the timeout is already set, just remove the binding and do nothing.
            // Note that it is not enough to off-bind the event on the first call: The
            // event may be able to fire again before the binding is removed, which leads to
            // double queries to be shown.
            if (SAGAME.showQueryTimeout != 0) { 
                $("#videoplayer").off("playing");              
                return; }
            
            
            SAGAME.showQueryTimeout = setTimeout(function() {
                // this is the main thing
                showQuery(query); 
                $("#videoplayer")[0].pause();

                // calc latency for diagnostics
                PERF_video_pause_called = Date.now();
                var latency = $("#videoplayer")[0].currentTime - query.stop_time;
                console.log("Stop time: "+ query.stop_time + " Video stopped: "+ $("#videoplayer")[0].currentTime + " latency: "+ latency);
                
                
                // preload the next video: this can be left out without worries
                // calling it here ensures that it will not be done for two videos at the same time during the first clip
                if (SAGAME.query_id + 1 < SAGAME.currentQueries.length) {
                    var nextQuery = SAGAME.currentQueries[SAGAME.query_id + 1];
                    var src = SAGAME.CLIPPATH + nextQuery.clip;
                    SAGAME.videoBuffer.buffer(src);
                }
                
                }, query.stop_time * 1000);
            
            // save the start
            var ev = new ExpEvent(query.clip, 'videoPlaying', $("#videoplayer")[0].currentTime);
            ev.save();
            });
    
        
        // show the information
        var txt = '('+ (SAGAME.query_id+1) +'/'+ SAGAME.currentClipset.length +')';
        if (SAGAME.showClipId) {
            txt += ' '+ query.clip.substring(0, SAGAME.clipIdLength) ;
        }
        $("#currentvideo").html(txt);

        // start playing
        $("#videoplayer")[0].play();
        
        PERF_video_play_called = Date.now();
        // $("#videoplayer").show();
        $("#videoplayer").fadeIn(500);
        $("#videoMask").hide()
            
        if (SAGAME.showMarkers) {
            // show the markers now, so that we get the surface enter to the camera approx. when the video starts playing
            // this is important so that it can be used to sync the scene camera
            showMarkers(); 
        }
        
        if (SAGAME.showMarkers) {
            // getting the markers positioned is tricky, because the video size changes	
            // during the first 0-500 ms before calling play so that markers can in a wrong position
            //
            // It is a MUST to reposition the markers after the size has been set.
            // //$("#videoplayer").off("resize");
            // //$("#videoplayer").resize( function() { showMarkers(); });        
            setTimeout(500, showMarkers);
        } 

        
        console.log("Playing " + $("#videoplayer")[0].src);                
        
    }
    

    
    /*
        This plays a single video in the game.
    */
    
	console.log("startGame called");
    
    prepare();
    
    SAGAME.showQueryTimeout = 0; // global! 
        
    if (SAGAME.query_id < SAGAME.currentQueries.length) {

        var query = SAGAME.currentQueries[SAGAME.query_id];
            
        var src = SAGAME.CLIPPATH + query.clip;
            // this will be used to check that the timeout function does not show queries when changing videos
        
        // preloadVideo($("#videoplayer")[0], src, run );

        $("#videoLoadingMsg").show();
        

        SAGAME.videoBuffer.waitVideo(src, function(src) { 
            $("#videoplayer")[0].src = src;
            showVideoMask();
            $("#videoLoadingMsg").hide();
            run();

            
            /* // calling it here ensures that it will not be done for two videos at the same time during the first clip
            // preload the next video: can be left out 
            if (SAGAME.query_id + 1 < SAGAME.currentQueries.length) {
                var nextQuery = SAGAME.currentQueries[SAGAME.query_id + 1];
                var src = SAGAME.CLIPPATH + nextQuery.clip;
                SAGAME.videoBuffer.buffer(src);
            }
            */
            
        });
            
    }
    

}




function finishVideo() {
/**
 * This functions cleans up everything if video is stopped abruptly and also when it ends normally. 
 */
    // $("#points").hide();
    // $("#exitGameButton").hide();
    
    // IE11 does not work with Jquery show/hide for some reason
    $("#currentvideo")[0].style.display = 'none';
    
    $("#points")[0].style.display = 'none'; 
    $("#exitGameButton")[0].style.display = 'none'; 
    
    $("#videoplayer").hide();
    clearTimeout(SAGAME.showQueryTimeout);
    $("#videoplayer")[0].src = null;
    
}

function finishGame() {
    /**
     * Function which can get called when a game ends or the player press exit. 
     */
    finishVideo();
    
    logToServer(sessionStorage.getItem("Freebike.SAGame.player_id"));

    if (SAGAME.currentGameCompleted == 1) {
        setScores(SAGAME.currentGameName, { points : SAGAME.currentPoints ,
                                            maxPoints : SAGAME.currentMaxPoints,
                                            completed : SAGAME.currentGameCompleted } );
                                        }
    // showScores(SAGAME.currentGameName);
}

function toggleQueryBox(query_id, box_id) {
	var query_box_id = "query_box_" + query_id + '_' + box_id;
	
	var qbox = document.getElementById(query_box_id);

	var status = getQueryBoxStatus(qbox);
	var newstatus = null;
	if (status == 'present') {
		newstatus = 'notpresent';
	
	} else {
		newstatus = 'present';
	}
	setQueryBoxStatus(qbox, newstatus);
	return newstatus;
}



function getQueryBoxStatus(qbox) {
    /*
        Helper function for knowing if the box/circle/location is selected or not.
    */
    
    var borderColor = qbox.style.borderColor; 
        	
	var status = null;
	if (borderColor != query_box_present_color) {
		status = 'notpresent';
	} else {
		status = 'present';
	}
	return status;
}

function setQueryBoxStatus(qbox, status) {
	/**
        Helper function for setting selecting/unselecting box/circle/location.
    */

	var borderColor = 'black';
	if (status == 'present') {
		borderColor = query_box_present_color;
	}
    qbox.style.borderColor = borderColor;
    
	return status;
}


////////////////////////// Points functions, start

function getScores(gameName) {
    var scoresStr = localStorage.getItem("Freebike.SAGame.scores");
    console.log(scoresStr);
    var scores = JSON.parse(scoresStr);
    
    if (scores.hasOwnProperty(gameName)) {
        return scores[gameName];
    } else {
        return null;
    }
}


function setScores(gameName, scores) { 
    var allScoresStr = localStorage.getItem("Freebike.SAGame.scores");
    var allScores = JSON.parse(allScoresStr);
    
    allScores[gameName] = scores;
    
    var scoresJSON = JSON.stringify(allScores);
    localStorage.setItem("Freebike.SAGame.scores", scoresJSON);    
    
    saveScoresToServer(scoresJSON);
}

function saveScoresToServer(scoresJSON) {
    /*
     * This function take the scores json and send it to the server for storage. 
     */
    
    if (SAGAME.SAVESCORESURL) {
        postJSONtoServer(scoresJSON, SAGAME.SAVESCORESURL);
    }
}


function updatePoints(pointGain) {
    /*
        Update points after each response. 
    */
    if (pointGain != 0) {        
        if (pointGain > 0) {
            $("#points").html('+' + pointGain);     
            $("#points").effect( {effect : "scale", percent : 125 } ).effect( {effect : "scale", percent : 80 }, 2000);
        } else {
            $("#points").html('' + pointGain); 
            $("#points").effect( "shake", {times: 5}, 1500);
        }
        setTimeout(function() { $("#points").html('' + SAGAME.currentPoints); }, 5000);
    } else {
        $("#points").html('' + SAGAME.currentPoints); 
    }
}

/////////// Points functions, end




///// Events for interaction


function setupInteraction() {
	
    $(document).ready(function() {
        $("#login").show(); 
        console.log("ready");
        
    });
    
    $("#goHomeAfterGameButton").click(function() {
        $("#endInstructions").hide()
        $("#home").show();
    });

    $("#exitGameButton").click(function() {
        // consider making exitVideo function
        finishGame();
        $("#home").show();
    });

    
    function login(playerID) {
        if (SAGAME.checkPlayerID) {
            console.log(playerID);
            console.log(SAGAME.validPlayerIDs);
            var x = $.inArray(playerID, SAGAME.validPlayerIDs);
            if (x == -1) {
                return false;
            }
        }
        
        sessionStorage.setItem("Freebike.SAGame.player_id", playerID); // who is playing 
        sessionStorage.setItem("Freebike.SAGame.session_id", Date.now()); // unique session
            

        return true;
    }
        
    
    // hack, this works for sagame2016
    $("#loginButton").click(function() { 
        var playerId = $("#playerId").val();
        if (playerId != "") {
    
            if (login(playerId)) {
                console.log("hei");
                //scoresTmpl = {'player_id' : playerId}
                
               
                
                $("#login").hide();
                $("#home").show();
            } else {
                alert("Antamasi pelaajatunnus ei ole käytössä. Tarkista pelaajatunnus ja koeta uudestaan.");
            }
            
        } else {
            alert("Please give player id!");
        }
    });
        


    $("#showPracticeInstructions").click(function() {
        console.log("showPracticeInstructions");
        $("#home").hide();
        $("#practiceInstructions").show();
        SAGAME.currentGameName = 'Practice';
        SAGAME.currentClipset = SAGAME.CLIPSETS.practice; // default behaviour
    });
    
    
    $("#showGameInstructions").click(function() {
        $("#home").hide();
        $("#gameInstructions").show();
        SAGAME.currentGameName = 'Game';
        SAGAME.currentClipset = SAGAME.CLIPSETS.game; // default behaviour
    });

    
    $("#startGame").click(function() {
        $("#gameInstructions").hide();
        startGame();
    });
    
    $("#startPractice").click(function() {
        $("#practiceInstructions").hide();
        startGame();
    });
        
    function startGame() {
        /**
            Function to play a game over the clipset specified in SAGAME global object
        */
        var videoSet = SAGAME.currentClipset; 

        
        SAGAME.currentMaxPoints = 0;
        
        SAGAME.currentPoints = 0;         
        updatePoints(0);
        
        

        
        if (SAGAME.randomizeOrder == 1)  {
            console.log("randomize order");
            videoSet = shuffleArray(SAGAME.currentClipset);
            // = videoSet; // is it necessary to do this? 
        }
        
        SAGAME.currentQueries = loadQueries(SAGAME.currentClipset);
        
        var queriesBeforeCalibration = SAGAME.calibInterval;
        
        
        
        function nextClip() {
            queriesBeforeCalibration -= 1;
            SAGAME.query_id += 1;
            if (SAGAME.query_id < videoSet.length) {
            
                playVideo();
                // playVideo(SAGAME.query_id, videoSet); 

            } else {
                // The player has finished this clipset. 
                // Now it is time to 
                // 1) log the data
                // 2) show end instruction 
                // 3) save the points from this 
                
                SAGAME.currentGameCompleted = 1;
                finishGame();
                

                $("#endInstructions").show();                             
                // try to show points
                $("#scoresAfterDisplay").html( SAGAME.currentPoints +"/"+ SAGAME.currentMaxPoints );
            }
        }
        
        
        $("#nextbutton").off("click"); 
        $("#nextbutton").click(function() {
            var query = SAGAME.currentQueries[SAGAME.query_id];
            var ev = new ExpEvent(query.clip, 'nextPressed', -1);
            ev.save();
        
            
            if (queriesBeforeCalibration == 0) { 
                $("#calibrationInstruction").show();
                
                // delay the activation of click to proceed
                setTimeout( function() {
                    $("#calibrationInstructionContinue").click( function(event) {
                        $("#calibrationInstruction").hide();
                        queriesBeforeCalibration = calibInterval;
                        nextClip();
                        $("#calibrationInstructionContinue").off("click");
                    });}, 5000);
                    

        
            } else {
                nextClip();
            }
        })
        
        
        SAGAME.query_id = -1;
        nextClip();
    }
    
    $("#checkbutton").click(function() {
        var query = SAGAME.currentQueries[SAGAME.query_id];
        var ev = new ExpEvent(query.clip, 'checkAnswersPressed', -1);
        ev.save();
        
        checkAnswers();
    });
    
    
	 // Keypresses
	$(document).keypress(function(event){
		switch (event.which) {
			case "a".charCodeAt(0):

                if ((SAGAME.query_id+1) < SAGAME.currentClipset.length) {            
                    finishVideo();
                    
                    SAGAME.query_id += 1;
                    playVideo();
                    //playVideo(SAGAME.query_id, SAGAME.currentClipset);
                }
				break;
                
			case "z".charCodeAt(0):
                if ((SAGAME.query_id-1) < SAGAME.currentClipset.length) {                            
                    finishVideo();
                    
                    SAGAME.query_id -= 1;;
                    playVideo();
                    //playVideo(SAGAME.query_id, SAGAME.currentClipset);
                }
				break;
            
            case "r".charCodeAt(0): // replay
                finishVideo();
                
                playVideo();
                //playVideo(SAGAME.query_id, SAGAME.currentClipset);
                break;
                
			case 'c'.charCodeAt(0):
				var mask = $("#videoMask")[0];
				
				if (mask.style.display == "block") {	
					mask.style.display = 'none';
				} else {
					mask.style.display = 'block';
				}
				break;
            case "1".charCodeAt(0):
                logToServer(sessionStorage.getItem("Freebike.SAGame.player_id"));

                
                //playVideo(SAGAME.query_id, SAGAME.currentClipset);
                break;
            
    
		}
	});
	
    $("#downloadanswers").click( function() {
        downloadDexieTable("answers");
    });
       
    $("#downloadmarkers").click( function() {
        downloadDexieTable("markers");
    });    
    
    $("#downloadevents").click( function() {
        downloadDexieTable("expevents");
    });    

}
	

