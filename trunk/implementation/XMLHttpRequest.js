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

	// Constructor
	function cXMLHttpRequest() {
		this.object	= oXMLHttpRequest ? new oXMLHttpRequest : new window.ActiveXObject('Microsoft.XMLHTTP');
	};

	// BUGFIX: Firefox with Firebug installed would break pages if not executed
	if (oXMLHttpRequest && oXMLHttpRequest.wrapped)
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
		var self	= this,
			nState	= this.readyState;

		this.object.onreadystatechange	= function() {
			// Synchronize states
			fSynchronizeStates(self);

			// BUGFIX: Firefox fires unneccesary DONE when aborting
			if (self._aborted) {
				// Reset readyState to UNSENT
				self.readyState	= self.constructor.UNSENT;

				// Return now
				return;
			}

			if (self.readyState == self.constructor.DONE) {
				//
				fCleanTransport(self);

				// BUGFIX: IE - cache issue
				if (!self.object.getResponseHeader("Date")) {
					// Save object to cache
					self._cached	= self.object;

					// Instantiate a new transport object
					self.constructor.call(self);

					// Re-send request
					self.object.open(sMethod, sUrl, bAsync, sUser, sPassword);
					self.object.setRequestHeader("If-Modified-Since", self._cached.getResponseHeader("Last-Modified") || new window.Date(0));
					// Copy headers set
					if (self._headers)
						for (var sHeader in self._headers)
							if (typeof self._headers[sHeader] == "string")	// Some frameworks prototype objects with functions
								self.object.setRequestHeader(sHeader, self._headers[sHeader]);
					self.object.onreadystatechange	= function() {
						// Synchronize states
						fSynchronizeStates(self);

						if (self.readyState == self.constructor.DONE) {
							if (self._aborted) {
								self.readyState	= self.constructor.UNSENT;

								self.responseText	= "";
								self.responseXML	= null;

								// Return
								return;
							}
							else {
								//
								if (self.status == 304) {
									// request = cached
									self.responseText	= self._cached.responseText;
									self.responseXML	= self._cached.responseXML;
								}

								// BUGFIX: IE - Empty documents in invalid XML responses
								if (self.responseXML)
									if (self.responseXML.parseError != 0)
										self.responseXML	= null;

								//
								fReadyStateChange(self);
							}

							// Clean Object
							fCleanTransport(self);
						}
					};
					self.object.send(null);

					// Return now - wait untill re-sent request is finished
					return;
				}

				// BUGFIX: Gecko - Annoying <parsererror /> in invalid XML responses
				// BUGFIX: IE - Empty documents in invalid XML responses
				if (self.responseXML)
					if (("parseError" in self.responseXML && self.responseXML.parseError != 0) || (self.responseXML.documentElement && self.responseXML.documentElement.tagName == "parsererror"))
						self.responseXML	= null;
			}

			// BUGFIX: Gecko - missing readystatechange calls in synchronous requests (this is executed when firebug is enabled)
			if (!self._async && self.constructor.wrapped) {
				self.readyState	= self.constructor.OPEN;
				while (++self.readyState < self.constructor.DONE)
					fReadyStateChange(self);
			}

			// BUGFIX: Some browsers (Internet Explorer, Gecko) fire OPEN readystate twice
			if (nState != self.readyState)
				fReadyStateChange(self);

			nState	= self.readyState;
		}
		// Add method sniffer
		if (this.constructor.onopen)
			this.constructor.onopen.apply(this, arguments);

		this.object.open(sMethod, sUrl, bAsync, sUser, sPassword);

		// BUGFIX: Gecko - missing readystatechange calls in synchronous requests
		if (!bAsync && window.navigator.userAgent.match(/Gecko\//)) {
			this.readyState	= this.constructor.OPEN;

			fReadyStateChange(this);
		}
	};
	cXMLHttpRequest.prototype.send	= function(vData) {
		// Add method sniffer
		if (this.constructor.onsend)
			this.constructor.onsend.apply(this, arguments);

		this.object.send(vData);

		// BUGFIX: Gecko - missing readystatechange events
		if (!this._async && !this.constructor.wrapped)
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

		this.object.abort();
	};
	cXMLHttpRequest.prototype.getAllResponseHeaders	= function() {
		return this.object.getAllResponseHeaders();
	};
	cXMLHttpRequest.prototype.getResponseHeader	= function(sName) {
		return this.object.getResponseHeader(sName);
	};
	cXMLHttpRequest.prototype.setRequestHeader	= function(sName, sValue) {
		// BUGFIX: IE - cache issue
		if (!this._headers)
			this._headers	= {};
		this._headers[sName]	= sValue;

		return this.object.setRequestHeader(sName, sValue);
	};
	cXMLHttpRequest.prototype.toString	= function() {
		return '[' + "object" + ' ' + "XMLHttpRequest" + ']';
	};
	cXMLHttpRequest.toString	= function() {
		return '[' + "XMLHttpRequest" + ']';
	};

	// Helper function
	function fReadyStateChange(self) {
		// Execute onreadystatechange
		if (self.onreadystatechange)
			self.onreadystatechange.apply(self);

		// Sniffing code
		if (self.constructor.onreadystatechange)
			self.constructor.onreadystatechange.apply(self);
	};

	function fSynchronizeStates(self) {
				self.readyState		= self.object.readyState;
		try {	self.responseText	= self.object.responseText;	} catch (e) {}
		try {	self.responseXML	= self.object.responseXML;	} catch (e) {}
		try {	self.status			= self.object.status;		} catch (e) {}
		try {	self.statusText		= self.object.statusText;	} catch (e) {}
	};

	function fCleanTransport(self) {
		// BUGFIX: IE - memory leak
		self.object.onreadystatechange	= new window.Function;

		// Delete private properties
		delete self._cached;
		delete self._headers;
	};

	// Internet Explorer 5.0 (missing apply)
	if (!window.Function.prototype.apply) {
		window.Function.prototype.apply	= function(self, oArguments) {
			if (!oArguments)
				oArguments	= [];
			self.__func	= this;
			self.__func(oArguments[0], oArguments[1], oArguments[2], oArguments[3], oArguments[4]);
			delete self.__func;
		};
	};

	// Register new object with window
	window.XMLHttpRequest	= cXMLHttpRequest;
})();