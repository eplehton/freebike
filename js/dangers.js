

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

db.version(4).stores({
    dangers: "++id,player_id,session_id,src,x,y,t,explanation,screenx,screeny,marker1x,marker1y,marker4x,marker4y,[player_id+src]"
});


function Danger(x, y, t, src, explanation, screenx, screeny, marker1x, marker1y, marker4x, marker4y) {
    this.player_id = player_id;
    this.session_id = session_id;
    
    this.x = x;
    this.y = y;
    this.t = t;
    this.src = src;
    this.real_t = Date.now();
    this.explanation = explanation;
    
    // This is for matching the presses to eye tracker.
    // Mostly redundant to save everytime but at least it is up-to-date. 
    this.screenx = screenx;
    this.screeny = screeny;
    this.marker1x = marker1x;
    this.marker1y = marker1y;
    this.marker4x = marker4x;
    this.marker4y = marker4y;
    
    
}



Danger.prototype.save = function() {
    db.dangers.put(this)
    .then( function(e) { console.log("Putted " + this + " " + e);}  )
    .catch( function(e) { console.log("Problems saving! " + e);} );
}


db.dangers.mapToClass(Danger);
db.open();


function downloadDangers() {
    db.dangers.toArray().then( function(saved_dangers) {
        console.log(saved_dangers);
        var dangers_json = JSON.stringify(saved_dangers);
        var blob = new Blob([dangers_json], {type : "text/plain;charset=utf-8"});
        saveAs(blob, "dangers.json");
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
        $(clicktoregister).hide();
        
        startRegistration(videoPos);
        showMarkers();

        
        // what we do after the registeration is done
        $(videoplayer).off("ended");
        $(videoplayer).on("ended", function(ev) {
            videoPos += 1;
            if (videoPos < videos.length) {
                $(clicktoregister).show(); // wait for the player
                hideMarkers();
            } else {
                console.log("Valmis!");
                $(start).show();
                hideMarkers();
            }
        });
        
    });
   
    $(instructions_explanation).click(function(ev) {
        $("instructions_explanation").hide();
        $("clicktoexplain").show();
    });
   
    
    $(clicktoexplain).click(function(ev) {
        
        $(clicktoexplain).hide();
        showMarkers();
        startExplanation(videoPos);
        
                
        // what we do after the explanation is done
        $(videoplayer).off("ended");
        $(videoplayer).on("ended", function(ev) {
            videoPos += 1;
            if (videoPos < videos.length) {
                $(clicktoexplain).show();
                hideMarkers();
            } else {
                console.log("Valmis!");
                $(start).show();
                hideMarkers();
            }
        });
            
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
        $(start).hide();
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

function registerDanger(x, y, t, src, screenx, screeny, marker1x, marker1y, marker4x, marker4y) {
    var d = new Danger(x, y, t, src, "", screenx, screeny, marker1x, marker1y, marker4x, marker4y);
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
        
    $("#marker1").offset({top: offset.top, left: offset.left - mw});
    $("#marker2").offset({top: offset.top, left: offset.left + vw});
    $("#marker3").offset({top: offset.top + vh, left: offset.left - mw});
    $("#marker4").offset({top: offset.top + vh, left: offset.left + vw});
    
    
    console.log( $("#marker1").offset() );
}


function startRegistration(videoPos) {
    $(videoplayer)[0].src = "videos/" + videos[videoPos];

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

        var screenX = ev.clientX;
        var screenY = ev.clientY;

        var relCrds = clientToVideo(vplayer, screenX, screenY);
        var relX = relCrds[0];
        var relY = relCrds[1];

        var marker1offset = $("#marker1").offset();
        var marker1offset = $("#marker1").offset();
        var marker1x = marker1offset.left;
        var marker1y = marker1offset.top;
        var marker4x = marker4offset.left + $("marker4").width();
        var marker4y = marker4offset.top + $("marker4").width();
        
        
        registerDanger(relX, relY, t, src, screenX, screenY, marker1x, marker1y, marker4x, marker4y);

        // visual effect
        var currentDanger = showDangerClick(x, y);
        setTimeout( function() { currentDanger.style.display = "none"}, SHOW_CLICK_TIME);

        // sound effect
        $(pointedsound)[0].play();
    });

    
    showMarkers();
    // make it run
    $(videoplayer)[0].play()
        


}

function startExplanation(videoPos) {
    $(videoplayer)[0].src = "videos/" + videos[videoPos];
    
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
    
}
    

function queryDangers(dangers) {
    
    function triggerAction(d) {
        // this is called when trigger is launched for the danger
        
        // stop the video
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
            d.save();
            
            //dangerClick.style.display = "none";

            //$(videoplayer).show();
            
            $(videoplayer).fadeIn(600, function() { $(videoplayer)[0].play(); }); 
        }
        
        window.addEventListener('storage', proceedAfterResponse);
    
        /* 
        // one window version
        showDangerQuery(d, function() {
            // this is the function which is called after showDangerQuery
            // rewrite with promises?
            console.log("showDangerQuery called with " + d.t);
            
            var txt = $(dangerexplanation).val();
            console.log("explanation" + txt);
            
            d.explanation = txt;
            d.save();
            
            $(dangerquery).hide();
            
            $(dangerexplanation).val("");
            $(dangerclick).hide();
            
            
            $(videoplayer)[0].play();
        });
        */
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
    
    
    
    
/*     console.log("queryDangersCalled");
    if (dangers.length > 0) {
        console.log("dangers.length > 0");
        $(videoplayer)[0].play();
        
        var d = dangers.shift();
        
        setTimeout(function() { 

            $(videoplayer)[0].pause();


            var clientCrds = videoToClient($(videoplayer)[0], d.x, d.y);
            var dangerClick = showDangerClick(clientCrds[0], clientCrds[1]);
            
            showDangerQuery(d, function() {
                $(dangerquery).hide();
                dangerClick.style.display = "none";
                
                var txt = $(dangerexplanation).val();
                setExplanation(d, txt);
                console.log("explanation set, will call queryDangers with " + dangers);
                queryDangers(dangers);
                });
                
            }, 1000 * (d.t - $(videoplayer)[0].currentTime));
        console.log("setTimeout called with " + (1000 * (d.t - $(videoplayer)[0].currentTime)) );
            
    } else {
        // to the next video
        
        videoPos += 1;
        if (videoPos < videos.length) {
            console.log("will call startNextExplanation with " + videoPos);
            startNextExplanation(videoPos);
        } else {
            console.log("Valmis");
            alert("Valmis!");
        }
    } */
}
