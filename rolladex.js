
function EditableImage(master, out_w, out_h, thumb_w, thumb_h)
{
	this.el = EL('label', 'EditableImage');
	this.master  = master;
	this.out_w = out_w;
	this.out_h = out_h;
	this.thumb_w = thumb_w;
	this.thumb_h = thumb_h;
	this.prod_id = "0";
	// setup image
	this.img = EL("img");
	this.img.style.position="absolute";
	this.img.style.opacity="0.5";

	LISTEN(this, this.img, "click", {capture:true});
	LISTEN(this, this.img, "mousedown", {capture:true});
	LISTEN(this, this.img, "mouseup", {capture:true});
	LISTEN(this, this.img, "mousemove", {capture:true});
	LISTEN(this, this.img, "wheel");
	LISTEN(this, this.img, "load");
	LISTEN(this, this.img, "dblclick");
	LISTEN(this, this.el, "change");
	LISTEN(this, this.el, "dragover");
	LISTEN(this, this.el, "drop");
	
	// setup fileinput
	this.fileinput = EL("input");
	this.fileinput.setAttribute('type', 'file');
	this.fileinput.style.position = "fixed";
	this.fileinput.style.top ="-100em";
	this.el.appendChild(this.fileinput);
	this.refresh(null);
}

EditableImage.prototype.on_click = function(e)
{
	e.stopPropagation(); 
	e.preventDefault(); 
}

EditableImage.prototype.file_in = function(source)
{
	var file = source.files ? source.files[0] : null;
	if (!file || !file.type.match(/image.*/))
		return;
	var reader = new FileReader();
	LISTEN(this, reader, "load", function(e) {
		this.img.src = e.target.result;
	});
	reader.readAsDataURL(file);
}

EditableImage.prototype.on_change = function(e)
{
	this.file_in(this.fileinput);
}

EditableImage.prototype.on_dragover = function(e)
{
	e.dataTransfer.dropEffect = 'copy';
}

EditableImage.prototype.on_drop = function(e)
{
	this.file_in(e.dataTransfer);
}

EditableImage.prototype.on_mousedown = function(e)
{
	e.stopPropagation(); 
	e.preventDefault(); 
	this.img.dragging = true;
	this.img.off_x = e.screenX - this.img.offsetLeft;
	this.img.off_y = e.screenY - this.img.offsetTop;
}

EditableImage.prototype.on_mouseup = function(e)
{
	this.img.dragging = false;
}

EditableImage.prototype.on_mousemove = function(e)
{
	if (this.img.dragging) {
		this.img.style.top = e.screenY - this.img.off_y;
		this.img.style.left = e.screenX - this.img.off_x;
	}
}

EditableImage.prototype.on_wheel = function(e)
{
	e.stopPropagation(); 
	e.preventDefault(); 
	mult = (e.deltaY > 0) ? 1.125 : 1.0/1.125;
	this.img.style.top = this.img.offsetTop + e.offsetY - e.offsetY*mult;
	this.img.style.left = this.img.offsetLeft + e.offsetX - e.offsetX*mult;
	this.img.style.width = this.img.offsetWidth*mult;
	this.img.style.height = this.img.offsetHeight*mult;
}

EditableImage.prototype.on_load = function(e)
{
	this.img.ow = this.img.width;
	this.img.oh = this.img.height;
	this.el.appendChild(this.img);
	var aimg = this.img.ow / this.img.oh;
	var afram = this.el.offsetWidth / this.el.offsetHeight;
	//~ alert(img.ow + " "+img.oh + " "+aimg + "\n"+
		//~ filelabel.offsetWidth + " " + filelabel.offsetHeight + " "+afram);
	this.img.style.width = this.el.offsetHeight*aimg;
	this.img.style.height = this.el.offsetHeight;
	this.img.style.left = 0;
	this.img.style.top = 0;
}

EditableImage.prototype.on_dblclick = function(e)
{
	var crop ={
		left: -this.img.offsetLeft *1.0/ this.img.offsetWidth,
		right: (-this.img.offsetLeft + this.el.offsetWidth)*1.0 /this.img.offsetWidth,
		top: -this.img.offsetTop*1.0 / this.img.offsetHeight,
		bottom: (-this.img.offsetTop + this.el.offsetHeight)*1.0 /this.img.offsetHeight
	};
	
	var crop_w =  (crop.right-crop.left)*this.img.ow;
	var crop_h = (crop.bottom-crop.top)*this.img.oh;
	
	var canvas_w = (crop_w < this.out_w) ? this.out_w : crop_w;
	var canvas_h = (crop_h < this.out_h) ? this.out_h : crop_h;
	
	//~ alert('crop: ' + crop_w + " " +crop_h + "\n" + 
		//~ 'orig: ' + this.img.ow + " " +this.img.oh + "\n" + 
		//~ 'out: ' + out_w + " "+out_h + "\n" +
		//~ 'canvas: ' + canvas_w + " " + canvas_h);
	
	var crop_canvas = EL('canvas');
	crop_canvas.setAttribute('width', canvas_w);
	crop_canvas.setAttribute('height', canvas_h);
	var ctx = crop_canvas.getContext("2d");
	ctx.fillStyle="white";
	ctx.fillRect(0,0,canvas_w,canvas_h);
	ctx.drawImage(this.img, crop.left*this.img.ow, crop.top*this.img.oh, crop_w, crop_h, 0, 0, canvas_w, canvas_h);
	
	function canvas_resize(tow, toh) {
		while (canvas_w != tow || canvas_h != toh)
		{
			canvas_w *= 0.75;
			if (canvas_w < tow)
				canvas_w =tow;
			canvas_h *= 0.75;
			if (canvas_h < toh)
				canvas_h = toh;

			var tmp_canvas = EL('canvas');
			tmp_canvas.setAttribute('width', canvas_w);
			tmp_canvas.setAttribute('height', canvas_h);
			tmp_canvas.getContext("2d").drawImage(crop_canvas, 0, 0, canvas_w, canvas_h);
			crop_canvas = tmp_canvas;
		}
	}
	canvas_resize.call(this, this.out_w, this.out_h);
	this.value = crop_canvas.toDataURL("image/jpeg", 0.95);
	canvas_resize.call(this, this.thumb_w, this.thumb_h);
	this.thumb = crop_canvas.toDataURL("image/jpeg", 0.95);
	this.el.style.backgroundImage='url('+this.value+')';
	this.el.removeChild(this.el.firstChild.nextSibling);
	this.img.src = "";
	this.el.dispatchEvent(new Event('set'));
	this.master.edit('image', this.value);
	this.master.edit('thumb', this.thumb);
}

EditableImage.prototype.refresh = function(img_data)
{
	//~ if (!img_data) {
		//~ this.fileinput.setAttribute("disabled", true);
		//~ return;
	//~ }
	this.value = img_data;
	if (img_data) {
		this.el.style.backgroundImage = "url("+img_data+")";
	} else {
		this.el.style.backgroundImage = "";
		this.el.style.backgroundColor = '#eef';
	}
}

EditableImage.prototype.enable = function(enable)
{
	this.fileinput.setAttribute("disabled", !enable);
}

/* ==============================
      Handle List
 ==============================*/

function HandleList(className)
{
	this.el = DIV(className);
	this.cur_id = "0";
	this.lst = {};
}

HandleList.prototype.refresh = function()
{
	this.lst = {};
	while (this.el.firstChild)
		this.el.removeChild(this.el.firstChild);
	this.el.appendChild(BUTTON("+", "thin button", DO(this, this.add_new)));
	this.fetch_all();
}

HandleList.prototype.select = function(id)
{
	if (this.cur_id != "0")
		this.lst[this.cur_id].className = "hnd";
	this.cur_id = id;
	if (this.cur_id != "0")
		this.lst[id].className = "hnd focus";
	this.el.dispatchEvent(new Event("select"));
}

HandleList.prototype.append_handle = function(data, pos) 
{
	this.lst[data.id] = DIV('hnd');
	this.lst[data.id].data = data;
	this.lst[data.id].innerHTML = data.name;
	LISTEN(this, this.lst[data.id], "click", function(e) {
		this.select(e.target.data.id);
	});
	this.el.appendChild(this.lst[data.id]);
}


/* ==============================
      Company List
 ==============================*/

function CompanyList()
{
	HandleList.call(this, "CompanyList");
}
CompanyList.prototype = Object.create(HandleList.prototype);

CompanyList.prototype.fetch_all = function()
{
	RPC("company_fetchall", {}, DO(this, function(data) {
		for (var d in data)
			this.append_handle(data[d], -1);
	}));
}


CompanyList.prototype.add_new = function()
{
	var company = prompt("Company Name", "");
	if (!company)
		return;
	RPC("company_new", {name:company}, DO(this, function(data) {
		if (data.id=="0") {
			alert("This company already exists.");
		} else {
			this.append_handle(data);
			this.select(data.id);
		}
	}));
}

/* ===== Company Details=============*/

function CompanyDetails()
{
	this.el = DIV("CompanyDetails");
	this.data = null;
	this.name = DIV("name");
	this.el.appendChild(this.name);
	this.fields = {
		yomi: new EditableText(this, 'yomi', "ローマ字"),
		area: new EditableSelect(this, 'area',  ['中国', '台湾', '韓国'], "地域"),
		address: new EditableText(this, 'address', "住所"),
		phone: new EditableText(this, 'phone', "電話"),
		fax: new EditableText(this, 'fax', "ファクス"),
		web: new EditableLink(this, 'web', "サイト"),
		email: new EditableText(this, 'email', "メール"),
		memo: new EditableMemo(this, 'memo', "メモ")
	};
	var prev = null;
	for (var f in this.fields) {
		if (prev)
			prev.next = this.fields[f];
		prev = this.fields[f]
		this.el.appendChild(prev.el);
	}
	this.fields.memo.next = this.fields.yomi;
}

CompanyDetails.prototype.edit = function(name, value)
{
	RPC("company_edit", {id:this.data.id, field:name, value:value}, function(){});
}

CompanyDetails.prototype.refresh = function(id)
{
	this.name.innerHTML = window.companies.lst[id].data.name;
	RPC("company_fetchone", {id:id}, DO(this, function(data) {
		this.data = data;
		for (var f in this.fields)
			this.fields[f].refresh(data[f]);
	}));
}

/* =========Stock Handle=========*/
function StockHdl(list, data)
{
	this.el = DIV("StockHdl");
	this.data = data;
	this.fields = {
		productid: new EditableProduct(this, 'productid'),
		size: new EditableSelect(this, 'size', ['1#', '2#', '3#', '4#', '15oz', '20oz', '72oz', '300']),
		price: new EditableText(this, 'price'),
		memo: new EditableMemo(this, 'memo'),
	};
	this.el.appendChild(BUILD(
		[HPAN("horiz"),
			this.fields.productid.el,
			[VPAN("vert"),
				this.fields.size.el,
				this.fields.price.el,
			],
			this.fields.memo.el
		]));
	for (var f in this.fields) 
		this.fields[f].refresh(data[f]);
	LISTEN(this, this.el, "keydown");
}

StockHdl.prototype.edit = function(name, value)
{
	if (!this.data.rowid)
		return;
	RPC("stock_edit", {rowid:this.data.rowid, field:name, value:value}, function(d) {});
}

StockHdl.prototype.on_keydown = function(e)
{
	if (e.keyCode == 'd' && e.shiftKey && e.ctlKey) {
		alert("DELETE");
	}
	
}

/* =======Stock List=============*/

function StockList()
{
	HandleList.call(this, "StockList");
	this.company_id = null;
}
StockList.prototype = Object.create(HandleList.prototype);

StockList.prototype.fetch_all = function()
{
	if (!this.company_id)
		return;
	RPC("stock_fetchall", {id:this.company_id}, DO(this, function(data) {
		for (var d in data) {
			if (this.company_id != data[d].companyid) {
				console.log("too slow");
				continue;
			}
			this.lst[data[d].rowid] = new StockHdl(this, data[d]);
			this.el.appendChild(this.lst[data[d].rowid].el);
		}
	}));
}


StockList.prototype.add_new = function()
{
	if (!this.company_id)
		return;
	RPC("stock_new", {id:this.company_id}, DO(this, function(data) {
		this.lst[data.rowid] = new StockHdl(this, data);
		this.el.appendChild(this.lst[data.rowid].el);
	}));
}

/* ====Product Handle=============*/
function ProductHdl(lst, data)
{
	this.el = DIV('ProductHdl');
	this.lst = lst;
	this.depth = 0;
	this.data = data;
	this.children = [];
	this.children_list = DIV('children');
	var label = LABEL(data.name, "lbl");
	var thumb = DIV("thumb");
	thumb.style.backgroundImage = this.thumb_url();
	this.el.appendChild(BUILD([HPAN("hdr"), thumb, label]));
	LISTEN(this, this.el,"click");
}

ProductHdl.prototype.thumb_url = function()
{
	return this.data.thumb? "url("+this.data.thumb+")" : "";
}

ProductHdl.prototype.add_child = function(product)
{	
	product.depth = this.depth+1;
	product.el.className += " child"+(product.depth%2);
	this.children.push(product);
	this.children_list.appendChild(product.el);
}

ProductHdl.prototype.set_expand = function(expand)
{
	if (this.el.contains(this.children_list) && !expand) {
		this.el.removeChild(this.children_list);
	} else if (!this.el.contains(this.children_list) && expand){
		this.el.appendChild(this.children_list);
	}
}

ProductHdl.prototype.on_click = function(e)
{
	e.stopPropagation(); 
	e.preventDefault(); 
	this.set_expand(!this.el.contains(this.children_list));
	this.lst.select(this.data.id);
}

/* =======Product List=============*/

function ProductList()
{
	HandleList.call(this, "CompanyList");
}
ProductList.prototype = Object.create(HandleList.prototype);

ProductList.prototype.fetch_all = function() 
{
	RPC("product_fetchall", {}, DO(this, function(data) {
		for (var d in data) 
			this.lst[data[d].id] = new ProductHdl(this, data[d]);
		for (var d in data) 
			if (data[d].parent != "0")
				this.lst[data[d].parent].add_child(this.lst[data[d].id]);

		this.view_hierarchy(true);
	}));
}

ProductList.prototype.add_new = function(expand)
{
	var product = prompt("Product Name", "");
	if (!product)
		return;
	RPC("product_new", {name:product}, DO(this, function(data) {
		if(!data.name) {
			alert("This product already exists.");
		} else {
			this.lst[data.id] = new ProductHdl(this, data);
			this.view_hierarchy(true);
		}
	}));
}

ProductList.prototype.view_hierarchy = function(expand)
{
	while(this.el.firstChild.nextSibling)
		this.el.removeChild(this.el.firstChild.nextSibling);
	
	for (var p in this.lst) {
		if (this.lst[p].data.parent == "0") {
			this.lst[p].set_expand(expand);
			this.el.appendChild(this.lst[p].el);
		}
	}
}

/* ======== Product Details============*/

function ProductDetails()
{
	this.data = null;
	this.name = DIV("name");
	this.fields = {
		image: new EditableImage(this, 256, 256, 64,64),
		yomi: new EditableText(this, 'yomi', "ローマ字"),
		parent: new EditableProduct(this, 'parent'),
	};
	this.el = BUILD([
		DIV("ProductDetails"),
		
		[HPAN("horiz"),
			[VPAN('vert'),
				this.name,
				this.fields.yomi.el,
			],
			this.fields.parent.el,
		],
		this.fields.image.el,
	]);
}

ProductDetails.prototype.refresh = function(id)
{
	RPC("product_fetchone", {id:id}, DO(this, function(data) {
		this.data = data;
		this.name.innerHTML = window.products.lst[data.id].data.name + "["+
			window.products.lst[data.id].data.id + "]";
		for (var f in this.fields)
			this.fields[f].refresh(data[f]);
	}));
}

ProductDetails.prototype.edit = function(name, value)
{
	function cycle(prod, id) {
		if (prod.data.parent == id)
			return true;
		if (prod.data.parent == "0")
			return false;
		return cycle(window.products.lst[prod.data.parent], id);
	}
	if (name == "parent") {
		var par = window.products.lst[this.data.id].data.parent;
		window.products.lst[this.data.id].data.parent = value;
		if (cycle(window.products.lst[this.data.id], this.data.id)) {
			alert("You can't create cycles");
			window.products.lst[this.data.id].data.parent = par;
			return ;
		}
	}
	RPC("product_edit", {id:this.data.id, field:name, value:value}, function(){});
	this.el.dispatchEvent(new Event("edit"));
	//~ window.products.refresh();
}
/* =======Product's Companies List=========*/

function ProductCompaniesList()
{
	this.el = DIV("CompanyList");
}

ProductCompaniesList.prototype.refresh = function(prod_id)
{
	while (this.el.firstChild)
		this.el.removeChild(this.el.firstChild);
	
	RPC("product_fetch_companies", {id:prod_id}, DO(this, function(data) {
		for (var d in data) {
			var hdl = DIV('hnd');
			hdl.data = {id:data[d]};
			hdl.innerHTML = window.companies.lst[data[d]].data.name;
			LISTEN(this, hdl, "click");
			this.el.appendChild(hdl);
		}
	}));
}

ProductCompaniesList.prototype.on_click = function(e)
{
	window.companies.select(e.target.data.id);
	window.view.flip(0);
}
/* =========Editable Field===============*/

function EditableField(master, name, label=null)
{
	this.el = DIV("EditableField");
	this.master = master;
	this.name = name;
	this.next = null;
	this.value = DIV("value");
	this.el.appendChild(this.value);
	this.popup = DIV("popup");
	if (label) {
		var lbl = LABEL(label, "lbl");
		LISTEN(this, lbl, "mousedown", function(e) {e.preventDefault();});
		LISTEN(this, lbl, "dblclick");
		this.el.appendChild(lbl);
		this.popup.appendChild(LABEL(label+"&nbsp;変更", "lbl"));
	}
	this.popup.appendChild(this.editor);

	LISTEN(this, this.editor, "keydown", function(e) {
		if (e.keyCode == 9) {
			e.preventDefault();
			if (this.next) {
				this.save();
				this.next.on_dblclick();
			}
		}else if (e.keyCode == 13 && e.shiftKey) {
			this.save();
		}
	});
	LISTEN(this, this.editor, "blur", {capture:true}, function(e) {
		//~ console.log("BLUR " +this.data);
		//~ if (this.el.contains(this.popup)){
			this.el.removeChild(this.popup);
			this.editor.value = this.data;
		//~ }
	});
	LISTEN(this, this.value, "dblclick");
	
}

EditableField.prototype.save = function(e)
{
	if (this.data != this.editor.value.trim()) {
		this.refresh( this.editor.value.trim());
		this.master.edit(this.name, this.editor.value.trim());
	}
	this.el.removeChild(this.popup);
}

EditableField.prototype.on_dblclick = function(e)
{
	this.el.appendChild(this.popup);
	this.editor.setSelectionRange(0, this.editor.value.length);
	this.editor.focus();
}

EditableField.prototype.refresh = function(value)
{
	this.data = value;
	this.editor.value = value;
	this.value.innerHTML=value ? value : "&nbsp;";
}

function EditableText(master, name, label)
{
	this.editor = TEXTBOX('input');
	EditableField.call(this, master, name, label);
}
EditableText.prototype = Object.create(EditableField.prototype);

function EditableLink(master, name, label)
{
	this.editor = TEXTBOX('input');
	this.link = EL('a');
	this.link.setAttribute("tabindex", -1);
	EditableField.call(this, master, name, label);
	this.value.appendChild(this.link);

}
EditableLink.prototype = Object.create(EditableField.prototype);
EditableLink.prototype.refresh = function(value)
{
	this.data = value;
	this.editor.value = value;
	this.link.innerHTML = value ? value : "&nbsp;";
	this.link.setAttribute("href", "http://"+value);
}


function EditableSelect(master, name, choices, label=null)
{
	this.choices = choices;
	this.editor = DROPDOWN(choices, 'input');
	EditableField.call(this, master, name, label);
}
EditableSelect.prototype = Object.create(EditableField.prototype);
EditableSelect.prototype.on_dblclick = function(e) {
	this.el.appendChild(this.popup);
	this.editor.focus();
}

function EditableMemo(master, name, label)
{
	this.editor = EL('textarea', 'input');
	EditableField.call(this, master, name, label);
	this.el.className = "EditableField memo";
}
EditableMemo.prototype = Object.create(EditableField.prototype);
EditableMemo.prototype.refresh = function(value)
{
	this.data = value;
	this.editor.value = value;
	this.value.innerHTML = value ? value.replace("\n","<br>") : "&nbsp;";
}

function ProductChooser()
{
	this.el = DIV("ProductChooser");
	
}
ProductChooser.prototype.refresh = function()
{
	while(this.el.firstChild)
		this.el.removeChild(this.el.firstChild);
	for (var p in window.products.lst) {
		var hdl = new ProductHdl(this.caller, window.products.lst[p].data)
		
		this.el.appendChild(hdl.el);
		
	}
}
function EditableProduct(master, name)
{
	this.el = DIV("EditableProduct");
	this.master = master;
	this.name = name;
	if(!window.product_chooser) 
		window.product_chooser = new ProductChooser();
	LISTEN(this, this.el, "dblclick", {capture:true});
	LISTEN(this, this.el, "click", {capture:true}, function(e) {e.preventDefault();});
}

EditableProduct.prototype.on_dblclick = function(e)
{
	e.preventDefault();
	e.stopPropagation();
	window.product_chooser.caller = this;
	window.product_chooser.refresh();
	GLASS(window.product_chooser.el);
}
EditableProduct.prototype.select = function(id)
{
	GLASS(null);
	this.refresh(id);
	this.master.edit(this.name, id);
}
EditableProduct.prototype.refresh = function(value)
{
	this.data = value;
	if(value != "0")
		this.el.style.backgroundImage = window.products.lst[value].thumb_url();
}

/* ==============================
      Company View
 ==============================*/
function CompanyView()
{
	this.el = DIV("CompanyView");
	window.companies = new CompanyList();
	this.details = new CompanyDetails();
	this.stock = new StockList();
	this.el.appendChild(SCROLL(window.companies.el));
	this.el.appendChild(this.details.el);
	this.el.appendChild(SCROLL(this.stock.el));
	LISTEN(this, window.companies.el, "select", function() {
		this.details.refresh(window.companies.cur_id);
		this.stock.company_id =window.companies.cur_id;
		this.stock.refresh();
	});
}

/* ==============================
      Product View
 ==============================*/
function ProductView()
{
	this.el = DIV("ProductView");
	window.products = new ProductList();
	this.details = new ProductDetails();
	var companies = new ProductCompaniesList();
	this.el.appendChild(SCROLL(window.products.el));
	this.el.appendChild(this.details.el);
	this.el.appendChild(SCROLL(companies.el));
	LISTEN(this, this.details.el, "edit", function() {
		window.products.refresh();
	});
	LISTEN(this, window.products.el, "select", function() {
		this.details.refresh(window.products.cur_id);
		companies.refresh(window.products.cur_id);
	});
}

function MainView()
{
	this.cur_view = 0;
	this.views = [new CompanyView(), new ProductView()];
	this.titles = ["会社ビュー", "商品ビュー",];
	this.bgs = [ "#efd", "#ffe"];
	this.title = LABEL(this.titles[0], "detail-title");
	this.el = BUILD(
		[VPAN("main"),
			[HPAN("header"),
				BUTTON("交", "button change", function(e) {window.view.flip();}),
				this.title,
			],
			this.views[0].el,
		]);
}

MainView.prototype.flip = function(view = -1)
{
	var new_view = this.cur_view;
	if (this.cur_view != 1 && (view == -1 || view == 1)) {
		new_view = 1;
	} else if (this.cur_view !=0 && (view == -1 || view ==0 )) {
		new_view = 0;
	}
	if (new_view != this.cur_view) {
		this.el.removeChild(this.views[this.cur_view].el);
		this.cur_view = new_view;
		this.el.appendChild(this.views[this.cur_view].el);
		this.title.innerHTML = this.titles[this.cur_view];
		document.body.style.backgroundColor = this.bgs[this.cur_view];
	}
}


window.view = new MainView();

function main()
{
	window.companies.refresh();
	window.products.refresh();
	document.body.appendChild(window.view.el)
}