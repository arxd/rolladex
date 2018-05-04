#!/usr/bin/python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import importlib, sys, traceback, os.path, json
try:
	from watchdog.events import FileSystemEventHandler
	from watchdog.observers import Observer
	have_watchdog = True
except:
	have_watchdog = False
	
APP = None
APP_MOD = None
APP_NAME = sys.argv[1]
HTML ="""<html>
<head>
<meta charset="UTF-8">
<title>%s</title>
<script>
function RPC(method, args, callback) 
{
	var xhr = new XMLHttpRequest();
	xhr.open("POST",method, true);
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
	xhr.onreadystatechange = function () {
		if(xhr.readyState === XMLHttpRequest.DONE) {
			if( xhr.status === 200) {
				callback(JSON.parse(xhr.responseText));
			} else {
				alert(xhr.responseText);
			}
		}
	};
	xhr.send(JSON.stringify(args));
}

function $(sel, el=document){return el.querySelector(sel);}

function EL(type, className="")
{
	var el = document.createElement(type);
	if (className)
		el.className = className;
	return el;
}

function DIV(className="") {return EL('div', className);}
function SPAN(className="") {
	var el = EL('span', className);
	el.style.display = "inline-block";
	return el;
}

function HPAN(className="") 
{
	var el = DIV(className);
	el.style.display = "flex";
	if (className=="") {
		el.style.justifyContent = "space-between";
		el.style.width="100%%";
		el.style.height="100%%";
	}
	return el;
}

function VPAN(className="")
{
	var el = HPAN(className);
	el.style.flexDirection = "column";
	return el;
}

function LABEL(txt, className="")
{
	var el = SPAN(className);
	el.innerHTML = txt;
	return el;
}

function DROPDOWN(options, className="")
{
	var el = EL("select", className);
	for (o in options) {
		var opt = EL("option");
		opt.innerHTML = options[o];
		el.appendChild(opt);
	}
	return el;
}

function TEXTBOX(className="")
{
	var el = EL('input', className);
	el.setAttribute('type', 'text');
	return el;
}

function SCROLL(inner)
{
	var outer = DIV(inner.className+'-outer');
	outer.style.position="relative";
	outer.appendChild(inner);
	inner.style.position="absolute";
	inner.style.overflowY="auto";
	inner.style.left="0";
	inner.style.right="0";
	inner.style.top="0";
	inner.style.bottom="0";
	return outer;
}

function BUILD(lst)
{
	var el = lst, i;
	if (lst.constructor == Array) {
		el = lst[0];
		for(var i=1; i < lst.length; i++)
			el.appendChild(BUILD(lst[i]));
	}
	return el;
}

function BUTTON(label, className="", callback)
{
	var el = LABEL(label, className);
	el.addEventListener("click", callback);
	return el;
}
function GLASS(child)
{
	var glass =document.getElementById("glass");
	if (!glass) {
		glass = DIV();
		glass.id = "glass";
		glass.addEventListener("click", function(e) {GLASS(null);});
		document.body.appendChild(glass);
	}
	while(glass.firstChild)
		glass.removeChild(glass.firstChild);
	if (!child) {
		glass.style.display="none";
		document.body.removeChild(glass.chld);
	} else {
		glass.chld = child;
		
		child.focus();
		document.body.appendChild(glass.chld);
		glass.style.display="block";
	}
}

function DO(self, func) {return function(e){func.call(self, e);}}
function LISTEN(self, el, event, opts_func=null, func=null) {
	var options = null;
	if (typeof opts_func === "function") {
		func = opts_func;
		options = {}
	} else {
		options = opts_func? opts_func : {};
	}
	func = func? func : self['on_'+event];
	el.addEventListener(event, DO(self, func), options);
}

</script>
<script src="%s.js" type="text/javascript" charset="utf-8"></script>
<style>
body {margin:0;padding:0; font-family:arial; font-size:12pt;}
</style>
<link rel="stylesheet" href="%s.css">
</head>
<body onload="main()">
</body>
</html>
"""
RELOAD=False

def reload():
	global APP_MOD, APP, APP_NAME, RELOAD
	if APP_MOD:
		try:
			APP.fini()
			APP_MOD = importlib.reload(APP_MOD)
			APP = APP_MOD.Server(sys.argv[2:])
			print("Reloaded "+APP_NAME)
			RELOAD = False
		except Exception:
			print("-"*60)
			traceback.print_exc(file=sys.stdout)
			print("-"*60)
			
	else:
		print("Loading "+APP_NAME)
		APP_MOD = importlib.import_module(APP_NAME)
		APP = APP_MOD.Server(sys.argv[2:])

if have_watchdog:
	class Watchdog(FileSystemEventHandler):	
		def on_modified(self, event):
			global RELOAD
			if event.src_path=="./"+APP_NAME+".py":
				RELOAD=True

class Handler(BaseHTTPRequestHandler):
	def resp(self, code, type):
		self.send_response(code)
		self.send_header("Content-Type", type)
		self.end_headers()
		
	def do_GET(self):
		if RELOAD:
			reload()
		if self.path == '/':
			self.resp(200, "text/html")
			self.wfile.write((HTML%(APP_NAME, APP_NAME, APP_NAME)).encode())
		else:
			ext = self.path.rfind('.')
			ext = self.path[ext+1:]
			if ext not in ['jpg', 'png', 'css', 'js'] or not os.path.isfile('.'+self.path):
				self.resp(404, "text/html")
				self.wfile.write("<html><head></head><body>404: Not found</body></html".encode())
			else:
				self.resp(200, {'js':'application/javascript', 'css':'text/css', 'png':'image/png', 'jpg':'image/jpeg'}[ext])
				with open('.'+self.path, 'rb') as f:
					self.wfile.write(f.read())
					
	def do_POST(self):
		if RELOAD:
			reload()
		r = self.rfile.read(int(self.headers['Content-Length'])).decode('utf-8')
		args = json.loads(r)
		try:
			resp = getattr(APP, "rpc_"+self.path[1:])(**args)
			self.resp(200, "application/json")
			self.wfile.write(json.dumps(resp).encode())
		except Exception:
			self.resp(500, "application/json")
			tb = traceback.format_exc()
			print("-"*60)
			print(tb)
			print("-"*60)
			self.wfile.write(tb.encode())
			


reload()
if have_watchdog:
	observer = Observer()
	event_handler = Watchdog()
	observer.schedule(event_handler, ".")
	observer.start()
try:
	server = HTTPServer( ("localhost",8080), Handler)
	server.serve_forever()
except KeyboardInterrupt:
	pass
if have_watchdog:
	observer.stop()
	observer.join()
APP.fini()

