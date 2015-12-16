

var dangers = [];
var videos = null;
var videoPos = 0;
var session_id = null;
var player_id = null;
var programMode = null;

var SHOW_CLICK_TIME = 250;
var last_click_time = 0;
var DOUBLE_CLICK_MARGIN = 150;

var db = new Dexie("Freebike.Dangers");

//db.version(2).stores({
//dangers: "++id,player_id,session_id,src,x,y,t,explanation,[player_id+session_id+src]"
//}); otto's answers are here

// 2015120301 was registered with this: we had problems with 
//db.version(4).stores({
//    dangers: "++id,player_id,session_id,src,x,y,t,explanation,screenx,screeny,marker1x,marker1y,marker4x,marker4y,[player_id+src]"
//});
// note version 4 data has also real_t even though it is not in the scheme...

/*db.version(6).stores({
    dangers: "++id,player_id,session_id,src,x,y,clientx,clienty,t,real_t,explanation,[player_id+src]",
    markers: "++id,real_t,marker_id,top,left,width,height,video_left, video_right, video_top, video_bottom,[real_t+marker_id]"
});*/


db.version(7).stores({
    dangers: "++id,player_id,session_id,src,x,y,clientx,clienty,t,real_t,explanation,explanation_real_t,[player_id+src]",
    markers: "++id,real_t,marker_id,top,left,width,height,video_left, video_right, video_top, video_bottom,[real_t+marker_id]",
    expevent: "++id,player_id,session_id,src,event,t,real_t,[player_id+src]"
});


function Danger(x, y, t, src, clientx, clienty, explanation, explanation_real_t) {
    this.player_id = player_id;
    this.session_id = session_id;
    
    this.x = x;
    this.y = y;
    this.t = t;
    this.src = src;
    this.real_t = Date.now();
    
    this.clientx = clientx;
    this.clienty = clienty;
	
    this.explanation = explanation;
    this.explanation_real_t = explanation_real_t;

	
/*	
    // 2015120301 was registered with this: we had problems with 
    // This is for matching the presses to eye tracker.
    // Mostly redundant to save everytime but at least it is up-to-date. 
  
	
    // location that was saved: what a mess!
    //    var marker1x = marker1offset.left;
    //    var marker1y = marker1offset.top;
    //    var marker4x = marker4offset.left + $("marker4").width();
    //    var marker4y = marker4offset.top + $("marker4").width() // why top + width sic!, should be -

    // // positioning algorithm
    //$("#marker1").offset({top: offset.top, left: offset.left - vw});
    //$("#marker2").offset({top: offset.top, left: offset.left + vw});
    //$("#marker3").offset({top: offset.top + vh, left: offset.left - mw});
    //$("#marker4").offset({top: offset.top + vh, left: offset.left + vw}); // why top + width, should be -

	
    this.screenx = screenx;
    this.screeny = screeny;
    this.marker1x = marker1x; // top left
    this.marker1y = marker1y; // top left
    this.marker4x = marker4x; // bottom right
    this.marker4y = marker4y; // bottom right
*/

}

Danger.prototype.save = function() {
    db.dangers.put(this)
    .then( function(e) { console.log("Danger click saved. " + this + " " + e);}  )
    .catch( function(e) { console.log("Problems saving danger clicks! " + e);} );
}


function Marker(real_t, marker_id, top, left, width, height, videoLeft, videoRight, videoTop, videoBottom) {
    /*
	Marker class represents the marker positions on the screen. 
    */
    this.real_t = real_t;
    this.marker_id = marker_id;
    
    this.top = top;
    this.left = left;
    this.width = width;
    this.height = height;
	
	
    this.video_left = videoLeft;
    this.video_right = videoRight;
    this.video_top = videoTop;
    this.video_bottom = videoBottom;
	
}

Marker.prototype.save = function() {
    db.markers.put(this)
    .then( function(e) { console.log("Marker position saved." + this + " " + e);}  )
    .catch( function(e) { console.log("Problems saving markers! " + e);} );
}

function ExpEvent(src, event, t) {
    this.player_id = player_id;
    this.session_id = session_id;
    
    this.src = src;
    this.t = t;
    this.real_t = Date.now();
    this.event = event;

}

ExpEvent.prototype.save = function() {
    db.expevent.put(this)
    .then( function(e) { console.log("ExpEvent saved." + this + " " + e);}  )
    .catch( function(e) { console.log("Problems saving ExpEvent! " + e);} );
}


db.dangers.mapToClass(Danger);
db.markers.mapToClass(Marker);
db.expevent.mapToClass(ExpEvent);
db.open();



function downloadDangers() {
    db.dangers.toArray().then( function(saved_dangers) {
        console.log(saved_dangers);
        var dangers_json = JSON.stringify(saved_dangers);
        var blob = new Blob([dangers_json], {type : "text/plain;charset=utf-8"});
        saveAs(blob, "dangers.json");
    });        
}

function downloadMarkers() {
    db.markers.toArray().then( function(saved_markers) {
        console.log(saved_markers);
        var markers_json = JSON.stringify(saved_markers);
        var blob = new Blob([markers_json], {type : "text/plain;charset=utf-8"});
        saveAs(blob, "markers.json");
    });        
}

function downloadExpEvents() {
    db.expevent.toArray().then( function(saved_expevents) {
        console.log(saved_expevents);
        var expevent_json = JSON.stringify(saved_expevents);
        var blob = new Blob([expevent_json], {type : "text/plain;charset=utf-8"});
        saveAs(blob, "expevents.json");
    });        
}


function openDangerQuery() {
    
    $(dangerquery).show();
    $(dangerwhat).focus();
    
    window.addEventListener('storage', function(e) {
        console.log("storage changed");
    });
 
    console.log("binded");   

    $(dangerqueryok).off(); 
    $(dangerqueryok).click( function(e) {
        var what = $(dangerwhat).val();
        var why = $(dangerwhy).val();
        var response = "#what#"+what +"#why#"+ why;
        
        console.log("explanation" + response);
        
        localStorage.setItem("dangers.response", response);
        $(dangerwhat).val("");
        $(dangerwhy).val("");
        $(dangerwhat).focus();
    });
}


function startSession() {
    /*
        Session is used to differentiate between multiple "playing times". 
         
    */
    session_id = sessionStorage.getItem("Freebike.Dangers.session_id");
    if (session_id == null) {
        session_id = ""+ Date.now();
        sessionStorage.setItem("Freebike.Dangers.session_id", session_id);
    }
}
    
function setupInteraction() {
    
    $(instructions_registration).click(function(ev) {
        $("instructions_registration").hide();
        $("clicktoregister").show();
    });
    
    
    $(clicktoregister).click(function(ev) {
        // handles changing the videos
	$(videoplayer).hide();
        $(clicktoregister).hide();
     
   
	
	//$("#videoplayer").showMarkers();
	
	    
        startRegistration(videoPos);
     
	
        
    });
   
    $(instructions_explanation).click(function(ev) {
        $("instructions_explanation").hide();
        $("clicktoexplain").show();
    });
   
    
    $(clicktoexplain).click(function(ev) {
        $(videoplayer).hide();
        $(clicktoexplain).hide();
        
        startExplanation(videoPos);        
            
    });
    
    $(loadvideos).change( function(ev) {
        var file = ev.target.files[0];
        console.log(file);
        var reader = new FileReader();
        reader.onload = function(e) {
            var videosStr = e.target.result;
            var clipData= JSON.parse(videosStr);
            var experiment = clipData.experiment;
            var practice = clipData.practice;
            
            shuffleArray(experiment); // random order
            
            videos = practice.concat(experiment);
            
            $(loadreg).show();
            $(loadexp).show();
            };
        reader.readAsText(file);
    });
    
    $("#loadreg").click( function() {
        $("#start").hide();
        // wait for the player
        $("#instructions_registration").show();
    });
    
    $("#instructions_registration").click( function() {
        
        // we only makey sure the videos start at the beginning
        // and the player information is right
        videoPos = 0;
        player_id = $(playerid).val();
        
        programMode = 'registration'; // this is interesting only for the manual video switching
        
        $("#instructions_registration").hide();
        // wait for the player
        $("#clicktoregister").show();
    });
    

   
    $("#loadexp").click( function() {
        $("#start").hide();
        // wait for the player
        $("#instructions_explanation").show();
    });

    $("#instructions_explanation").click( function() {
	$("#instructions_explanation").hide();
        videoPos = 0;
        
        player_id = $(playerid).val();

        programMode = 'explanation'; // this is interesting only for the manual video switching
        
        $(clicktoexplain).show(); 
    });
    
    $(opendangerquery).click( function() {
        $(start).hide();
        openDangerQuery();
    });
    
    $(opendangerquery).click( function() {
        $(start).hide();
        openDangerQuery();
    });

    $("#downloaddangers").click( function() {
        downloadDangers();
    });
       
    $("#downloadmarkers").click( function() {
        downloadMarkers();
    });    
    
    $("#downloadexpevents").click( function() {
	downloadExpEvents();
    });    
    
    
    
    // Start the show
    
    $(start).show(); 
    $(loadreg).hide(); // do not show before the video list and player id has been set
    $(loadexp).hide();

        
    // Keypresses
    $(document).keypress(function(event){
		switch (event.which) {
			case "a".charCodeAt(0):
				videoPos += 1;
                if (programMode == 'registration') {
                    $(clicktoregister).show();
                } else if (programMode == 'explanation') {
                    $(clicktoexplain).show();
                }   
				break;
			case "z".charCodeAt(0):
                videoPos -= 1;
                if (programMode == 'registration') {
                    $(clicktoregister).show();
                } else if (programMode == 'explanation') {
                    $(clicktoexplain).show();
                }
				break;
            }
	});

        
}


function hideMarkers() {
    $("#marker1").hide();
    $("#marker2").hide();
    $("#marker3").hide();
    $("#marker4").hide();
}

function registerDanger(x, y, t, src, screenx, screeny) {
    var d = new Danger(x, y, t, src, screenx, screeny, "", 0);
    d.save();
}


//function setExplanation(danger, txt) {
//    danger.explanation = txt
//    danger.save();
//}

function showDangerClick(x, y) {
    var dangerTemplate = $(dangerclick)[0];
    
    var currentDanger = dangerTemplate.cloneNode();
    currentDanger.id = "danger_" + Date.now();
    $("body").append(currentDanger);
    
    currentDanger.style.display = "block";
    currentDanger.style.position = "absolute";
    currentDanger.style.left = x - (0.5 * currentDanger.offsetWidth)  + "px";
    currentDanger.style.top = y - (0.5 * currentDanger.offsetHeight) + "px";
    
    return(currentDanger);
}


/*var researcherWindow;

function openRequestedPopup(x, y) {
    console.log("popup");
    researcherWindow = window.open(
    "dangers.researcherwin.html",
    "DescriptiveWindowName",
    "resizable,scrollbars,status,left="+ x +",top="+ y);
}
*/
function showDangerQuery(danger, on_ok) {
    
    $(dangerquery).show();
    
    var dq = $(dangerquery)[0];
    var dclick = $(dangerclick)[0];
    
    var clientCrds = videoToClient($(videoplayer)[0], danger.x, danger.y);
    console.log(clientCrds);

    // showing it in place
    dq.style.display = "block";
    dq.style.position = "absolute";
    dq.style.left = clientCrds[0] + "px";
    dq.style.top = clientCrds[1] + "px";

    dclick.style.display = "block";
    dclick.style.position = "absolute";
    dclick.style.left = clientCrds[0] - (0.5 * dclick.offsetWidth)  + "px";
    dclick.style.top = clientCrds[1] - (0.5 * dclick.offsetHeight) + "px";
    
    
    $(dangerqueryok).off(); // it is very important to clear the old handler so that they do not relaunch
    $(dangerqueryok).click(on_ok);
}

function showMarkers() {

    $("#marker1").show();
    $("#marker2").show();
    $("#marker3").show();
    $("#marker4").show();

    var offset = $("#videoplayer").offset();
    var vw = $("#videoplayer").width();
    var vh = $("#videoplayer").height();
    var mw = $("#marker1").width();

    // we use the same positioning function as for clicks to get absolutely
    // comparable coordinates
	
	
    
    var tl = videoToClient($(videoplayer)[0], 0, 0);
    var tr = videoToClient($(videoplayer)[0], 1, 0);
    var bl = videoToClient($(videoplayer)[0], 0, 1);
    var br = videoToClient($(videoplayer)[0], 1, 1);
  
    /*
    $("#debug_videoarea").show();
    $("#debug_videoarea").offset({top: tl[1], left: tl[0]});
    $("#debug_videoarea").width( br[0] - tl[0] );
    $("#debug_videoarea").height( br[1] - tl[1] );
    */
    
    
    // setInterval(rai, 500);    

    // markers are place outside the video screen
    $("#marker1").offset({top: tl[1] - 0 * $("#marker1").height(), left: tl[0] - $("#marker1").width()});
    $("#marker2").offset({top: tr[1] - 0 * $("#marker2").height(), left: tr[0]});
    $("#marker3").offset({top: bl[1] - 1 * $("#marker3").height(), left: bl[0] - $("#marker3").width()});
    $("#marker4").offset({top: br[1] - 1 * $("#marker4").height(), left: br[0]});
    
    // save positions
    var real_t = Date.now();
    var marker_id = "marker1";
    var m1 = new Marker(real_t, marker_id, 
			$("#"+marker_id).offset().top, $("#"+marker_id).offset().left, 
			$("#"+marker_id).width(), $("#"+marker_id).height(),
			tl[0], br[0], tl[1], br[1]);
    var marker_id = "marker2";
    var m2 = new Marker(real_t, marker_id, 
			$("#"+marker_id).offset().top, $("#"+marker_id).offset().left, 
			$("#"+marker_id).width(), $("#"+marker_id).height(),
			tl[0], br[0], tl[1], br[1]);
    
    var marker_id = "marker3";
    var m3 = new Marker(real_t, marker_id, 
			$("#"+marker_id).offset().top, $("#"+marker_id).offset().left, 
			$("#"+marker_id).width(), $("#"+marker_id).height(),
			tl[0], br[0], tl[1], br[1]);
    var marker_id = "marker4";
    var m4 = new Marker(real_t, marker_id, 
			$("#"+marker_id).offset().top, $("#"+marker_id).offset().left, 
			$("#"+marker_id).width(), $("#"+marker_id).height(),
			tl[0], br[0], tl[1], br[1]);
    
    
    m1.save();
    m2.save();
    m3.save();
    m4.save();
   
    //console.log( $("#marker1").offset() );
}


function startRegistration(videoPos) {
    var videoSrc = "videos/" + videos[videoPos];
    $(videoplayer)[0].src = videoSrc;

    // videoplayer click action
    $(videoplayer).off("click");
    $(videoplayer).click(function(ev) {
        
        // prevent double click to get registered as two clicks
        var now = Date.now();
        if (last_click_time + DOUBLE_CLICK_MARGIN > now) { 
            console.log("double click prevented: " + (now - last_click_time) + "ms");
            return; 
        }
        last_click_time = now;
        
        var vplayer = $(videoplayer)[0];
        var t = vplayer.currentTime;
        var src = vplayer.src.split("/").pop(); 

        var clientX = ev.clientX;
        var clientY = ev.clientY;

        var relCrds = clientToVideo(vplayer, clientX, clientY);
        var relX = relCrds[0];
        var relY = relCrds[1];

        /*var marker1offset = $("#marker1").offset();
        var marker4offset = $("#marker4").offset();
        var marker1x = marker1offset.left;
        var marker1y = marker1offset.top;
        var marker4x = marker4offset.left + $("marker4").width();
        var marker4y = marker4offset.top + $("marker4").width();*/
        
        
        registerDanger(relX, relY, t, src, clientX, clientY);

        // visual effect
        var currentDanger = showDangerClick(clientX, clientY);
        setTimeout( function() { currentDanger.style.display = "none"}, SHOW_CLICK_TIME);

        // sound effect
        $(pointedsound)[0].play();
    });


    

    $(videoplayer).off("play");
    $(videoplayer).on("play", function(ev) {
	var ev = new ExpEvent(videoSrc, 'regplay', $(videoplayer)[0].currentTime);
	ev.save();
    });
    
    // getting the markers positioned is tricky, because the video size changes	// during the first 0-1000 ms before calling play
    // It is MUST to reposition the markers after the size has been set.
    $(videoplayer).off("resize");
    $(videoplayer).resize( function() { showMarkers(); });
    $(videoplayer).fadeIn(600, showMarkers);

    // what we do after the registeration is done
    $(videoplayer).off("ended");
    $(videoplayer).on("ended", function(ev) {
        var ev = new ExpEvent(videoSrc, 'regended', $(videoplayer)[0].currentTime);
	ev.save();
	    
	videoPos += 1;
	if (videoPos < videos.length) {
	    $(clicktoregister).show(); // wait for the player
	    hideMarkers();
	    $(videoplayer).hide();
	} else {
	    console.log("Valmis!");
	    $(start).show();
	    hideMarkers();
	    $(videoplayer).hide();
	}
    });
    
        
    $(videoplayer)[0].play();

    
    // update the clip id
    var clipId = videoSrc.substring( videoSrc.indexOf("/")+1, videoSrc.indexOf("/") + 4 );
    $("#currentvideo").html( (videoPos+1) +"/"+ videos.length + " ("+ clipId +")" );
    
}

function startExplanation(videoPos) {
    var videoSrc = "videos/" + videos[videoPos];
    $(videoplayer)[0].src = videoSrc;
	
    // make sure there is no click actions left
    $(videoplayer).off("click"); 

    // load the targets for the video
    // and start the queryDangers function
    var src = $(videoplayer)[0].src.split("/").pop();
    db.dangers.where("[player_id+src]")
        .equals([player_id, src]).toArray()
        .then( function(dangerArr) {
            //dangers = dangerArr
            console.log("dangers found");
            console.log(dangerArr);
            queryDangers(dangerArr);
        });
    
    $(videoplayer).off("resize");
    $(videoplayer).resize( function() { showMarkers(); });
    $(videoplayer).fadeIn(600, showMarkers);
	
    // register when it starts
    $(videoplayer).off("play");
    $(videoplayer).on("play", function(ev) {
	var ev = new ExpEvent(videoSrc, 'explplay', $(videoplayer)[0].currentTime);
	ev.save();
    });
    
    $(videoplayer).off("pause");
    $(videoplayer).on("pause", function(ev) {
	var ev = new ExpEvent(videoSrc, 'explpause', $(videoplayer)[0].currentTime);
	ev.save();
    });
    
    // what we do after the explanation is done
    $(videoplayer).off("ended");
    $(videoplayer).on("ended", function(ev) {
        var ev = new ExpEvent(videoSrc, 'explended', $(videoplayer)[0].currentTime);
	ev.save();
	    
	videoPos += 1;
        if (videoPos < videos.length) {
   	    $(clicktoexplain).show();
	    hideMarkers();
	    $(videoplayer).hide();
        } else {
	    console.log("Valmis!");
	    $(start).show();
	    hideMarkers();
	    $(videoplayer).hide();
        }
    });
}
    

function queryDangers(dangers) {
    
    function triggerAction(d) {
        // this is called when trigger is launched for the danger
        
        // pause the video
        $(videoplayer)[0].pause();
        
	// notify the dangerQuery window via localStorage
        localStorage.setItem("dangers.pleaseask", Date.now());

        var clientCrds = videoToClient($(videoplayer)[0], d.x, d.y);

        var dangerClick = showDangerClick(clientCrds[0], clientCrds[1]);
        
        setTimeout(function() {
            $(videoplayer).hide();
            dangerClick.style.display = "none";
        }, 400);
        
        function proceedAfterResponse(e) {
            console.log("storage changed 2");

            window.removeEventListener('storage', proceedAfterResponse);
            
            d.explanation = localStorage.getItem("dangers.response");
	    d.explanation_real_t = Date.now();
            d.save();
            
            // We start playing only after the timeout because the participant may 
	    // have clicked very fast after the previous.
	    // Here we do not need to refresh markers, because the video has already played
	    // and is therefore already in the right size. 
            $(videoplayer).fadeIn(600, function() { $(videoplayer)[0].play(); }); 
        }
        
        window.addEventListener('storage', proceedAfterResponse);
	
    }
    
    
    function triggerFor(danger) {
        /*
            This is only for providing the right danger object and inactivating
            the trigger after one launch. This could be simplified.  
        */
        var triggered = false;
        function triggerInContext() {
            $(videoplayer).on("timeupdate", function(ev) {
                if (ev.target.currentTime >= danger.t && !triggered) {
                    console.log("triggered");
                    triggered = true;
                    triggerAction(danger);
                }
            });
        }
        triggerInContext();
    }
    
    
    $(videoplayer).off("timeupdate");
    for (d of dangers) {
        triggerFor(d);
    }
    // set it play and wait for the triggers
    $(videoplayer)[0].play();
    
}
