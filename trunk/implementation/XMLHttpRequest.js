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
	var xXMLHttpRequest	= window.XMLHttpRequest;

	// Constructor
	function XMLHttpRequest() {
		this.object	= xXMLHttpRequest ? new xXMLHttpRequest : new window.ActiveXObject('Microsoft.XMLHTTP');
	}

	// BUGFIX: Firefox with Firebug installed would break pages if not executed
	if (xXMLHttpRequest && xXMLHttpRequest.wrapped)
		XMLHttpRequest.wrapped	= xXMLHttpRequest.wrapped;

	// Constants
	XMLHttpRequest.UNSENT	= 0;
	XMLHttpRequest.OPEN		= 1;
	XMLHttpRequest.SENT		= 2;
	XMLHttpRequest.LOADING	= 3;
	XMLHttpRequest.DONE		= 4;

	// Public Properties
	XMLHttpRequest.prototype.readyState		= XMLHttpRequest.UNSENT;
	XMLHttpRequest.prototype.responseText	= "";
	XMLHttpRequest.prototype.responseXML	= null;
	XMLHttpRequest.prototype.status			= 0;
	XMLHttpRequest.prototype.statusText		= "";

	// Class-level Events Handlers
	XMLHttpRequest.onreadystatechange	= null;
	XMLHttpRequest.onopen				= null;
	XMLHttpRequest.onsend				= null;
	XMLHttpRequest.onabort				= null;

	// Instance-level Events Handlers
	XMLHttpRequest.prototype.onreadystatechange	= null;

	// Public Methods
	XMLHttpRequest.prototype.open	= function(sMethod, sUrl, bAsync, sUser, sPassword) {

		// Store parameters
		this.method		= sMethod;
		this.url		= sUrl;
		this.async		= bAsync;

		// Set the onreadystatechange handler
		var self	= this,
			nState	= this.readyState;

		this.object.onreadystatechange	= function fOnReadyStateChange() {
			// Synchronize states
			fSynchronizeStates(self);

			// BUGFIX: Firefox fires unneccesary DONE when aborting
			if (self.aborted) {
				self.readyState	= self.constructor.UNSENT;
				delete self.aborted;
				return;
			}

			if (self.readyState == self.constructor.DONE) {
				// Clean Object
				fCleanTransport(self);

				// BUGFIX: IE - cache issue
				if (!self.object.getResponseHeader("Date") && sMethod == "GET") {
					// Save object to cache
					self.cached	= self.object;

					// Instantiate a new transport object
					XMLHttpRequest.call(self);

					// Re-send request
					self.object.open(sMethod, sUrl, bAsync, sUser, sPassword);
					self.object.setRequestHeader("If-Modified-Since", self.cached.getResponseHeader("Last-Modified") || new Date(0));
					// Copy headers set
					if (self.headers)
						for (var sHeader in self.headers)
							if (typeof self.headers[sHeader] == "string")	// Some frameworks prototype objects with functions
								self.object.setRequestHeader(sHeader, self.headers[sHeader]);
					self.object.onreadystatechange	= function() {
						// Synchronize states
						fSynchronizeStates(self);

						if (self.readyState == self.constructor.DONE) {
							//
							if (self.status == 304) {
								// request = cached
								self.responseText	= self.cached.responseText;
								self.responseXML	= self.cached.responseXML;
							}

							// Clean Object
							fCleanTransport(self);

							// BUGFIX: IE - Empty documents in invalid XML responses
							if (self.responseXML)
								if (self.responseXML.parseError != 0)
									self.responseXML	= null;

							//
							fReadyStateChange(self);
						}
					};
					self.object.send(null);

					// Return now - wait untill re-sent request is finished
					return;
				}

				// BUGFIX: Gecko - Annoying <parsererror /> in invalid XML responses
				// BUGFIX: IE - Empty documents in invalid XML responses
				if (self.responseXML)
					if (self.responseXML.parseError != 0 || (self.responseXML.documentElement && self.responseXML.documentElement.tagName == "parsererror"))
						self.responseXML	= null;
			}

			// BUGFIX: Gecko - missing readystatechange calls in synchronous requests (this is executed when firebug is enabled)
			if (!self.async && self.constructor.wrapped) {
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
		if (!this.async && window.navigator.userAgent.match(/Gecko\//)) {
			this.readyState	= this.constructor.OPEN;

			fReadyStateChange(this);
		}
	};
	XMLHttpRequest.prototype.send	= function(vData) {
		// Add method sniffer
		if (this.constructor.onsend)
			this.constructor.onsend.apply(this, arguments);

		this.object.send(vData);

		// BUGFIX: Gecko - missing readystatechange events
		if (!this.async && !this.constructor.wrapped) {
			while (this.readyState++ < this.constructor.DONE)
				fReadyStateChange(this);
		}
	};
	XMLHttpRequest.prototype.abort	= function() {
		// Add method sniffer
		if (this.constructor.onabort)
			this.constructor.onabort.apply(this, arguments);

		// BUGFIX: Gecko - unneccesary DONE when aborting
		if (this.readyState > this.constructor.UNSENT)
			this.aborted	= true;

		this.object.abort();
	};
	XMLHttpRequest.prototype.getAllResponseHeaders	= function() {
		return this.object.getAllResponseHeaders();
	};
	XMLHttpRequest.prototype.getResponseHeader	= function(sName) {
		return this.object.getResponseHeader(sName);
	};
	XMLHttpRequest.prototype.setRequestHeader	= function(sName, sValue) {
		// BUGFIX: IE - caceh issue
		if (!this.headers)
			this.headers	= {};
		this.headers[sName]	= sValue;

		return this.object.setRequestHeader(sName, sValue);
	};
	XMLHttpRequest.prototype.toString	= function() {
		return "[object XMLHttpRequest]";
	};
	XMLHttpRequest.toString	= function() {
		return "[XMLHttpRequest]";
	};

	// Helper function
	function fReadyStateChange(self) {
		// Execute onreadystatechange
		if (self.onreadystatechange)
			self.onreadystatechange.apply(self);

		// Sniffing code
		if (self.constructor.onreadystatechange)
			self.constructor.onreadystatechange.apply(self);
	}

	function fSynchronizeStates(self) {
				self.readyState		= self.object.readyState;
		try {	self.responseText	= self.object.responseText;	} catch (e) {}
		try {	self.responseXML	= self.object.responseXML;	} catch (e) {}
		try {	self.status			= self.object.status;		} catch (e) {}
		try {	self.statusText		= self.object.statusText;	} catch (e) {}
	}

	function fCleanTransport(self) {
		self.object.onreadystatechange	= new Function;
		delete self.cached;
		delete self.headers;
	}

	// Internet Explorer 5.0 (missing apply)
	if (!Function.prototype.apply) {
		Function.prototype.apply	= function(self, oArguments) {
			if (!oArguments)
				oArguments	= [];
			self.__func	= this;
			self.__func(oArguments[0], oArguments[1], oArguments[2], oArguments[3], oArguments[4]);
			delete self.__func;
		};
	}

	// Register new object with window
	window.XMLHttpRequest	= XMLHttpRequest;
})();