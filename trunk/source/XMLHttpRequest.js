// Copyright 2007 Sergey Ilinsky (http://www.ilinsky.com)
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function () {

	// Save reference to earlier defined object implementation (if any)
	var oXMLHttpRequest	= window.XMLHttpRequest;

	// Define on browser type
	var bGecko	= !!window.controllers,
		bIE		= document.all && !navigator.userAgent.match(/opera/i),
		bFireBug= bGecko && oXMLHttpRequest.wrapped;

	// Constructor
	function cXMLHttpRequest() {
		this._object	= oXMLHttpRequest ? new oXMLHttpRequest : new window.ActiveXObject('Microsoft.XMLHTTP');
	};

	// BUGFIX: Firefox with Firebug installed would break pages if not executed
	if (bFireBug)
		cXMLHttpRequest.wrapped	= oXMLHttpRequest.wrapped;

	// Constants
	cXMLHttpRequest.UNSENT	= 0;
	cXMLHttpRequest.OPEN	= 1;
	cXMLHttpRequest.SENT	= 2;
	cXMLHttpRequest.LOADING	= 3;
	cXMLHttpRequest.DONE	= 4;

	// Public Properties
	cXMLHttpRequest.prototype.readyState	= cXMLHttpRequest.UNSENT;
	cXMLHttpRequest.prototype.responseText	= "";
	cXMLHttpRequest.prototype.responseXML	= null;
	cXMLHttpRequest.prototype.status		= 0;
	cXMLHttpRequest.prototype.statusText	= "";

	// Instance-level Events Handlers
	cXMLHttpRequest.prototype.onreadystatechange	= null;

	// Class-level Events Handlers
	cXMLHttpRequest.onreadystatechange	= null;
	cXMLHttpRequest.onopen				= null;
	cXMLHttpRequest.onsend				= null;
	cXMLHttpRequest.onabort				= null;

	// Public Methods
	cXMLHttpRequest.prototype.open	= function(sMethod, sUrl, bAsync, sUser, sPassword) {

		// Save async parameter for fixing Gecko bug with missing readystatechange in synchronous requests
		this._async		= bAsync;

		// Set the onreadystatechange handler
		var oRequest	= this,
			nState		= this.readyState;


		// BUGFIX: IE - memory leak on page unload
		if (bIE) {
			var fOnUnload	= function() {
				if (oRequest._object.readyState != 4)
					fCleanTransport(oRequest);
			};
			window.attachEvent("onunload", fOnUnload);
		}

		this._object.onreadystatechange	= function() {
			// Synchronize states
			fSynchronizeStates(oRequest);

			// BUGFIX: Firefox fires unneccesary DONE when aborting
			if (oRequest._aborted) {
				// Reset readyState to UNSENT
				oRequest.readyState	= oRequest.constructor.UNSENT;

				// Return now
				return;
			}

			if (oRequest.readyState == oRequest.constructor.DONE) {
				//
				fCleanTransport(oRequest);

				// BUGFIX: IE - memory leak in interrupted
				if (bIE)
					window.detachEvent("onunload", fOnUnload);

				// BUGFIX: IE - cache issue
				if (!oRequest._object.getResponseHeader("Date")) {
					// Save object to cache
					oRequest._cached	= oRequest._object;

					// Instantiate a new transport object
					oRequest.constructor.call(oRequest);

					// Re-send request
					oRequest._object.open(sMethod, sUrl, bAsync, sUser, sPassword);
					oRequest._object.setRequestHeader("If-Modified-Since", oRequest._cached.getResponseHeader("Last-Modified") || new window.Date(0));
					// Copy headers set
					if (oRequest._headers)
						for (var sHeader in oRequest._headers)
							if (typeof oRequest._headers[sHeader] == "string")	// Some frameworks prototype objects with functions
								oRequest._object.setRequestHeader(sHeader, oRequest._headers[sHeader]);

					oRequest._object.onreadystatechange	= function() {
						// Synchronize states
						fSynchronizeStates(oRequest);

						if (oRequest.readyState == oRequest.constructor.DONE) {
							if (oRequest._aborted) {
								oRequest.readyState	= oRequest.constructor.UNSENT;

								oRequest.responseText	= "";
								oRequest.responseXML	= null;

								// Return
								return;
							}
							else {
								//
								if (oRequest.status == 304) {
									// request = cached
									oRequest.responseText	= oRequest._cached.responseText;
									oRequest.responseXML	= oRequest._cached.responseXML;
								}

								// BUGFIX: IE - Empty documents in invalid XML responses
								if (oRequest.responseXML)
									if (oRequest.responseXML.parseError != 0)
										oRequest.responseXML	= null;

								//
								fReadyStateChange(oRequest);
							}

							// Clean Object
							fCleanTransport(oRequest);
						}
					};
					oRequest._object.send(null);

					// Return now - wait untill re-sent request is finished
					return;
				}

				// BUGFIX: Gecko - Annoying <parsererror /> in invalid XML responses
				// BUGFIX: IE - Empty documents in invalid XML responses
				if (oRequest.responseXML)
					if (("parseError" in oRequest.responseXML && oRequest.responseXML.parseError != 0) || (oRequest.responseXML.documentElement && oRequest.responseXML.documentElement.tagName == "parsererror"))
						oRequest.responseXML	= null;
			}

			// BUGFIX: Gecko - missing readystatechange calls in synchronous requests (this is executed when firebug is enabled)
			if (!oRequest._async && bFireBug) {
				oRequest.readyState	= oRequest.constructor.OPEN;
				while (++oRequest.readyState < oRequest.constructor.DONE)
					fReadyStateChange(oRequest);
			}

			// BUGFIX: Some browsers (Internet Explorer, Gecko) fire OPEN readystate twice
			if (nState != oRequest.readyState)
				fReadyStateChange(oRequest);

			nState	= oRequest.readyState;
		};
		// Add method sniffer
		if (this.constructor.onopen)
			this.constructor.onopen.apply(this, arguments);

		this._object.open(sMethod, sUrl, bAsync, sUser, sPassword);

		// BUGFIX: Gecko - missing readystatechange calls in synchronous requests
		if (!bAsync && bGecko) {
			this.readyState	= this.constructor.OPEN;

			fReadyStateChange(this);
		}
	};
	cXMLHttpRequest.prototype.send	= function(vData) {
		// Add method sniffer
		if (this.constructor.onsend)
			this.constructor.onsend.apply(this, arguments);

		this._object.send(vData);

		// BUGFIX: Gecko - missing readystatechange events
		if (!this._async && !bFireBug)
			while (this.readyState++ < this.constructor.DONE)
				fReadyStateChange(this);
	};
	cXMLHttpRequest.prototype.abort	= function() {
		// Add method sniffer
		if (this.constructor.onabort)
			this.constructor.onabort.apply(this, arguments);

		// BUGFIX: Gecko - unneccesary DONE when aborting
		if (this.readyState > this.constructor.UNSENT)
			this._aborted	= true;

		this._object.abort();

		// BUGFIX: IE - memory leak
		fCleanTransport(this);
	};
	cXMLHttpRequest.prototype.getAllResponseHeaders	= function() {
		return this._object.getAllResponseHeaders();
	};
	cXMLHttpRequest.prototype.getResponseHeader	= function(sName) {
		return this._object.getResponseHeader(sName);
	};
	cXMLHttpRequest.prototype.setRequestHeader	= function(sName, sValue) {
		// BUGFIX: IE - cache issue
		if (!this._headers)
			this._headers	= {};
		this._headers[sName]	= sValue;

		return this._object.setRequestHeader(sName, sValue);
	};
	cXMLHttpRequest.prototype.toString	= function() {
		return '[' + "object" + ' ' + "XMLHttpRequest" + ']';
	};
	cXMLHttpRequest.toString	= function() {
		return '[' + "XMLHttpRequest" + ']';
	};

	// Helper function
	function fReadyStateChange(oRequest) {
		// Execute onreadystatechange
		if (oRequest.onreadystatechange)
			oRequest.onreadystatechange.apply(oRequest);

		// Sniffing code
		if (oRequest.constructor.onreadystatechange)
			oRequest.constructor.onreadystatechange.apply(oRequest);
	};

	function fSynchronizeStates(oRequest) {
				oRequest.readyState		= oRequest._object.readyState;
		try {	oRequest.responseText	= oRequest._object.responseText;	} catch (e) {}
		try {	oRequest.responseXML	= oRequest._object.responseXML;	} catch (e) {}
		try {	oRequest.status			= oRequest._object.status;		} catch (e) {}
		try {	oRequest.statusText		= oRequest._object.statusText;	} catch (e) {}
	};

	function fCleanTransport(oRequest) {
		// BUGFIX: IE - memory leak
		oRequest._object.onreadystatechange	= new window.Function;

		// Delete private properties
		delete oRequest._cached;
		delete oRequest._headers;
	};

	// Internet Explorer 5.0 (missing apply)
	if (!window.Function.prototype.apply) {
		window.Function.prototype.apply	= function(oRequest, oArguments) {
			if (!oArguments)
				oArguments	= [];
			oRequest.__func	= this;
			oRequest.__func(oArguments[0], oArguments[1], oArguments[2], oArguments[3], oArguments[4]);
			delete oRequest.__func;
		};
	};

	// Register new object with window
	window.XMLHttpRequest	= cXMLHttpRequest;
})();