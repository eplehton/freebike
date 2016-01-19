
/*
    Specify Dexie database
*/
var db = new Dexie("Freebike.SAGame");

db.version(2).stores({
    

    answers: "++id, player_id, src, src_stop_time, query_id, box_id, query_started_realt, answer_latency, answer, target_id, target_type, target_x, target_y", 
    markers: "++id,real_t,marker_id,top,left,width,height,video_left, video_right, video_top, video_bottom,[real_t+marker_id]",
    expevent: "++id,player_id,session_id,src,event,t,real_t,[player_id+src]"
});


function Answer(player_id, src, src_stop_time, box_id, query_started_real_t, answer_latency, answer, target_id, target_type, target_x, target_y) {
    /*
	Answer class represent answers and related information.
    */
    this.player_id = player_id;
    this.src = src;
    this.src_stop_time = src_stop_time;
    this.box_id = box_id;
    this.query_started_real_t = query_started_real_t;
    this.answer_latency = answer_latency;
    this.answer = answer;
    this.target_id = target_id;
    this.target_type = target_type;
    this.target_x = target_x;
    this.targety = target_y;
	
}


/* 
    We specify how Marker.save function works in SA game. 
*/
Marker.prototype.save = function() {
    db.markers.put(this)
    .then( function(e) { console.log("Marker position saved." + this + " " + e);}  )
    .catch( function(e) { console.log("Problems saving markers! " + e);} );
}


/*
    Global variables for the game
*/
var local_storage_targets = "targets";
var cached_targets = null;


var query_id = -1;
var query_box_present_color = 'green';
var query_started_realt = null; // global var which is used when registering not presence (should be something neater...)
var showQueryTimeout = null;

var test_answers = [];

var clippath = CLIPPATH; 

var clipsets = CLIPSETS; 

var pointCounter = 0;


function annoTargets2TestQuery(clipname, all_targets) {
	var cur_trgs = all_targets[clipname];
	
	if (cur_trgs === undefined) {
		alert("No targets with clipname: " + clipname);
	}
	
	//console.log(clipname)
    
	var stop_time = cur_trgs[0].t.slice(-1).pop();
		
	var query = {clip : clipname, stop_time : stop_time, items : []};
	
	for (var i=0; i<cur_trgs.length; i++) {
		var ct = cur_trgs[i];
		
		console.log(ct.t);
		if (stop_time.toFixed(1) !== ct.t.slice(-1).pop().toFixed(1)) {
			console.log("annoTargets2TestQuery receives anno targets with varying last t. Sorry, but it cannot understand what to do now.");
		} else {
			
			query.items.push( {target_id: ct.id, type: ct.type, x : ct.x.slice(-1).pop(), y : ct.y.slice(-1).pop()} ); 
		}
		
	}
	//console.log('query', query);
	
	return query;
}


function clearQueries() {
	var parent = document.getElementById("screen");
	var query_boxes = parent.getElementsByClassName("query_box");
	
	for (var i=query_boxes.length; i--; i >= 0) {
		var node = query_boxes.item(i);
		node.parentNode.removeChild(node);
	}		
	

}


function confirmAnswers() {
	
	if (query_id >= 0) {
		var query = test_queries[query_id];

        
        var had_miss = false;
        var pointGain = 0;
        
		for (var box_id=0; box_id<query.items.length; box_id++) {
			var qitem = query.items[box_id];
			var query_box_id = "query_box_" + query_id + '_' + box_id;
			
			var qbox = document.getElementById(query_box_id);
			var status = getQueryBoxStatus(qbox);
			if (status == 'notpresent') {
			
				registerPresence(query, query_id, box_id, "notpresent", query_started_realt);
			}
            
            
            if (status == 'present') {
                var qbt = qbox.getElementsByClassName("query_box_target").item(0);
                qbt.style.backgroundColor = 'transparent';
            }
                
            if ((qitem.type != 'nothing') && (status == 'notpresent')){
                had_miss = true;
                
                // argh!
                var qbt = qbox.getElementsByClassName("query_box_target").item(0);
                
                qbt.style.borderColor = "red";
                qbt.style.borderWidth = "3px";
                qbt.innerHTML = "<p>-5</p>";
                pointGain += -5;
                
                
            }
            
            if ((qitem.type != 'nothing') && (status == 'present')){
                var qbt = qbox.getElementsByClassName("query_box_target").item(0);
                
                qbt.style.borderColor = "green";
                qbt.style.borderWidth = "3px";
                qbt.innerHTML = "<p>+5</p>";
                pointGain += 5;
            } 
            
            if ((qitem.type == 'nothing') && (status == 'notpresent')){
                var qbt = qbox.getElementsByClassName("query_box_target").item(0);
                
                qbt.style.borderColor = "gray";
                qbt.style.borderWidth = "3px";
                qbt.innerHTML = "<p>+1</p>";
                pointGain += 1;
            } 
            
		}
        
        if (had_miss) {
            $("#missplayer")[0].play();
            
        } else {
            $("#targethitplayer")[0].play();
        }
        
        $(videoplayer)[0].style.display = "block";
        
        pointCounter += pointGain;
        if (pointCounter < 0) {
            pointCounter = 0;
        }
        
        //$(points)[0].style.width = (1 + 20*pointCounter) + "px";
        $(points)[0].innerHTML = '<p>' + pointCounter + '</p>';
	}
	
    
    $("#videoMask").hide();
	$("#checkbutton").hide();
	$("#nextbutton").show();
	
	
}


function loadTargetsFrom(json_file) { 
    
    $.getJSON(json_file, function(data) {
        cached_targets = data;
    });
	
}



function loadQueries() {
	var all_targets = cached_targets;
	
	var testset_num = sessionStorage.getItem("testset_num");
	if (testset_num == null) { // this was 'null' : bug!
		testset_num = 0;
    }	
    
    
    //console.log(testset_num, clipsets);
	var cliplist = clipsets[testset_num];
	//console.log('cliplist', cliplist);
	
	var test_queries = [];
	
	for (var i=0; i<cliplist.length; i++) {
		var clipname = cliplist[i];
		var query = annoTargets2TestQuery(clipname, all_targets);
		test_queries.push(query);
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
	var player_id = sessionStorage.getItem("player_id");
	var answer_latency = (Date.now() - query_started_realt) / 1000;
	
	var answer = { player_id : player_id,
				   src : query.clip,
		           src_stop_time : query.stop_time,
				   query_id : query_id,
				   box_id : box_id,
				   query_started_realt : query_started_realt,
				   answer_latency : answer_latency,
				   answer : answer,
				   target_id :  query_items[box_id].target_id,
		           target_typetype : query_items[box_id].type,
				   target_x : query_items[box_id].x,
		           target_y : query_items[box_id].y};
				   
	test_answers.push(answer);
}


//~ function rel2Client(videoplayer, relx, rely) {
	//~ /*
		//~ Converts video relative coordinates to client coordinates.
		//~ Should this be in a common library?
	//~ */
    //~ var x = relx * videoplayer.offsetWidth + videoplayer.offsetLeft
    //~ var y = rely * videoplayer.offsetHeight + videoplayer.offsetTop
    //~ return [x, y]
//~ } 


function showQuery(query) {
	console.log("showQuery called with:");
    console.log(query);
    console.log(query.items);
    
    var query_items = query.items;
	
	
	var vplayer = document.getElementById("videoplayer");
	var nbutton = document.getElementById("nextbutton");
	var screen = document.getElementById("screen");

	
	var qbt = document.getElementById("query_box_template");

	
	vplayer.pause();
	
	query_started_realt = Date.now();
	
		
	for (var box_id=0; box_id<query_items.length; box_id++) {
		var query_box_id = "query_box_" + query_id + '_' + box_id;

		var qbox = qbt.cloneNode(true);
		qbox.id = query_box_id;


		var qitem = query_items[box_id];
		

		function makeCallbackTB(qi, q_id, b_id) {
			return function() { var status = toggleQueryBox(q_id, b_id); 
                                
                                console.log("query", query, q_id)
                                console.log(query.items[b_id])
                
                                if ((query.items[b_id].type != 'nothing') && (status == 'present')) {
                                    console.log("Correct selection!");
                                } else {
                                    console.log("False positive!");
                                }
							    registerPresence(query, q_id, b_id, status, query_started_realt); } 
		}
		
		
		qbox.addEventListener("click", makeCallbackTB(qitem, query_id, box_id), false);

		screen.appendChild(qbox);  
		qbox.style.display = "block";
		
		var clientxy = videoToClient(vplayer, qitem.x, qitem.y);
		var centering =	[qbox.offsetWidth * 0.5, qbox.offsetHeight * 0.5];
		
		
		qbox.style.top = (clientxy[1] - centering[1]) + "px"; 
		qbox.style.left = (clientxy[0] - centering[0]) + "px";
		
		
		

	}

	showVideoMask();
    
	$("#checkbutton").show();
}

function showVideoMask() {
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


function saveTestAnswers() {
	var answers_key = "trubike.test.answers";
	
	var player_id = sessionStorage.getItem("player_id");
	var local_answers_str = localStorage.getItem(answers_key);

	var local_answers = JSON.parse(local_answers_str);
	if (local_answers === null) {
		local_answers = {};
	}
	
	// console.log("trubike.test.answers recovered from localStorage: ", local_answers);
	
	if (! local_answers.hasOwnProperty(player_id) )  {
		local_answers[player_id] = [];
	}
	
	
	local_answers[player_id].push(test_answers);
	
	// console.log("local_answers with player_id ", local_answers[player_id]);
	
	localStorage.setItem(answers_key, JSON.stringify(local_answers));
	
	
}
	 


function startNextClip() {
	console.log("startNextClip called");
    
	query_id += 1;
	
	if (query_id == 0) {
		test_queries = loadQueries();
	}
	
	
	saveTestAnswers();
	test_answers = []; // clear it, so that is wont be duplicated
	
	clearQueries();
	
	
	$("#nextbutton").hide();
	
    
	// console.log('test_queries', test_queries);
	
	if (query_id < test_queries.length) {
		var query = test_queries[query_id];

	    $("#videoplayer").hide();
 
		$("#videoplayer")[0].src = clippath + query.clip; 
        
        $("#currentvideo").html( query.clip.substring(0,3) );
        
        console.log("Playing " + $("#videoplayer")[0].src);
        
        // getting the markers positioned is tricky, because the video size changes	
        // during the first 0-500 ms before calling play
        // It is MUST to reposition the markers after the size has been set.
        $("#videoplayer").off("resize");
        $("#videoplayer").resize( function() { showMarkers(); });
        $("#videoplayer").fadeIn(500, showMarkers);
        
		$("#videoplayer")[0].play();
        var src = $("#videoplayer")[0].src;
        
        $("#videoplayer").off("timeupdate");        
        $("#videoplayer").bind('timeupdate', function() {
            if ($("#videoplayer")[0].currentTime > query.stop_time) {
                if (src != $("#videoplayer")[0].src) {
                    console.log(src);
                    console.log($("#videoplayer")[0].src);
                    console.log("showQuery not called, because videoplayer has a different source! This should happen when jumping with a and z.");
                    return;
                }
                
                showQuery(query); 
                $("#videoplayer")[0].pause();
                console.log("Query stop time: "+ query.stop_time + " Video stopped: "+ $("#videoplayer")[0].currentTime);
            }
        });
        
        
        /*
        setTimeout(function() {
            if (src != $("#videoplayer")[0].src) {
                console.log(src);
                console.log($("#videoplayer")[0].src);
                console.log("showQuery not called, because videoplayer has a different source! This should happen when jumping with a and z.");
                return;
            }
            showQuery(query); 
            $("#videoplayer")[0].pause(); 
            console.log("Query stop time: "+ query.stop_time + " Video stopped: "+ $("#videoplayer")[0].currentTime);
            }, 
            query.stop_time * 1000);
        */

	} else {
		alert("Done!");
	}
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
	var qbt = qbox.getElementsByClassName("query_box_target").item(0);
	var bgcolor = qbt.style.backgroundColor;
	
	var status = null;
	if (bgcolor != query_box_present_color) {
		status = 'notpresent';
	} else {
		status = 'present';
	}
	return status;
}

function setQueryBoxStatus(qbox, status) {
	var qbt = qbox.getElementsByClassName("query_box_target").item(0);
	var bgcolor = 'transparent';
	if (status == 'present') {
		bgcolor = query_box_present_color;
	}
	qbt.style.backgroundColor = bgcolor;
	return status;
}



function setupInteraction() {
	
    $(document).ready(function() {
        $("#start").show(); 
    });
    
    $("#startButton").click(function() {
        var playerId = $("#playerId").val();
        if (playerId != "") {
            sessionStorage.setItem("player_id", playerId);
            sessionStorage.setItem("Freebike.SAGame.session_id", Date.now());
            
            $("#start").hide();
            $("#gameInstructions").show();
        } else {
            alert("Please give player id!");
        }
    });
    
    $("#startFirstVideoButton").click(function() {
        $("#gameInstructions").hide();
        startNextClip();
    })

    $("#nextbutton").click(function() {
        startNextClip();
    })

    $("#checkbutton").click(function() {
        confirmAnswers();
    });
    
	 // Keypresses
	$(document).keypress(function(event){
		switch (event.which) {
			case "a".charCodeAt(0):
                startNextClip();
				break;
			case "z".charCodeAt(0):
                query_id -= 2;
				startNextClip();
				break;
			case 'c'.charCodeAt(0):
				var vplayer = document.getElementById("videoplayer");
				
				if (vplayer.style.display == "block") {	
					vplayer.style.display = 'none';
				} else {
					vplayer.style.display = 'block';
				}
				break;
		}
	});
	
}
	
