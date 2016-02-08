

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


function hideMarkers() {
    $("#marker1").hide();
    $("#marker2").hide();
    $("#marker3").hide();
    $("#marker4").hide();
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
  
    /* // markers are placed outside the video screen
    $("#marker1").offset({top: tl[1] - 0 * $("#marker1").height(), left: tl[0] - $("#marker1").width()});
    $("#marker2").offset({top: tr[1] - 0 * $("#marker2").height(), left: tr[0]});
    $("#marker3").offset({top: bl[1] - 1 * $("#marker3").height(), left: bl[0] - $("#marker3").width()});
    $("#marker4").offset({top: br[1] - 1 * $("#marker4").height(), left: br[0]});
    */
    
    // markers are placed inside the video screen
    $("#marker1").offset({top: tl[1] - 0 * $("#marker1").height(), left: tl[0]});
    $("#marker2").offset({top: tr[1] - 0 * $("#marker2").height(), left: tr[0] - $("#marker2").width()});
    $("#marker3").offset({top: bl[1] - 1 * $("#marker3").height(), left: bl[0] });
    $("#marker4").offset({top: br[1] - 1 * $("#marker4").height(), left: br[0] - $("#marker4").width()});
    
    
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
    
}
