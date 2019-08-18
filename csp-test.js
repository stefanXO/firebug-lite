window.cspMode = ( function() {
	var cspScript = document.getElementById('FirebugLiteCSPTest');
	try {
		new Function( "" );
		cspScript.setAttribute("csp-mode", true);
		//console.log("csp works");
		return true;
	} catch ( e ) {
		//alert("des not work!");
		//console.log("csp does not work");
		cspScript.setAttribute("csp-mode", false);
		return false;
	}
} )();