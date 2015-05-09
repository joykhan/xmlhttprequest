## Important Notice: Project moved to [http://github.com/ilinsky/xmlhttprequest](http://github.com/ilinsky/xmlhttprequest) ##

### This project aims to: ###
  * Deliver unobtrusive standard-compliant (W3C) **cross-browser implementation** of the [XMLHttpRequest 1.0](http://www.w3.org/TR/XMLHttpRequest/) object
  * **Fix ALL browsers quirks** observed in their native XMLHttpRequest object implementations
  * Enable **transparent logging** of XMLHttpRequest object activity

### Browser quirks ~~fixed~~: ###
| **Browser Name** | **Problem description** |
|:-----------------|:------------------------|
| All browsers | ~~missing static members (UNSENT, OPENED, HEADERS\_RECEIVED, LOADING, DONE)~~ |
| Internet Explorer All / Opera All | ~~missing EventTarget interface implementation~~ |
| Internet Explorer 7.0| ~~Native XMLHttpRequest object can't load local files in IE7~~ <sup>new</sup> |
| Internet Explorer<7.0| ~~missing native XMLHttpRequest object support~~ |
| Internet Explorer 6.0 | ~~memory leak caused by onreadystatechange handler (on-page)~~ |
| Internet Explorer 6.0 | ~~memory leak caused by onreadystatechange handler (inter-page)~~  |
| Internet Explorer All | ~~connections leakage between pages~~ |
| Internet Explorer All | ~~onreadystatechange wrong execution context~~ |
| Gecko All | ~~onreadystatechange wrong execution context~~ |
| Internet Explorer All | ~~readystatechange OPENED fired twice~~ |
| Gecko All | ~~readystatechange OPENED fired twice~~ |
| Gecko All | ~~missing readystatechange calls in synchronous requests~~ |
| Gecko All | ~~unnecessary readystatechange DONE call when request aborted~~ |
| Gecko All | ~~annoying "&gt;parsererror /&lt;" document for invalid XML documents~~ |
| Internet Explorer All | ~~empty documents for invalid XML documents~~ |
| Opera 9.x | ~~empty documents for invalid XML documents~~ |
| Internet Explorer 6.0 | ~~cached document is not checked against modification date~~ (uncomment in source to use) |
| Internet Explorer All | ~~responseXML is not properly initialized for application/xxx+xml responses~~ |
| Safari 3.0 | ~~sending document created/modified dynamically chunks serializing~~  |
| Internet Explorer All | ~~custom Content-Type overridden when sending XML nodes~~  |


### How To Use: ###
```
<head>
    ...
        <script type="text/javascript" src="XMLHttpRequest.js"></script>
    ...
</head>
```

### Known issues: ###
  * implementation doesn't throw errors on accessing _status_ and _statusText_ properties in an inappropriate moment of time

### Links to online resources ###
  * [XMLHttpRequest object implementation explained](http://www.ilinsky.com/articles/XMLHttpRequest)