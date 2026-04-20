// Advanced Portal Designer - Ajax Support 
// (c) hougaard.com 2024
// 3.0.0.41

var RootLocation = '/demo/';

var requests = new Array();
var errorCode = 0;
//FN
var globalField_d;
if(typeof(XMLHttpRequest) == 'undefined')
	var XMLHttpRequest = function()
	{
		var request = null;
		try
		{
			request = new ActiveXObject('Msxml2.XMLHTTP');
		}
		catch(e)
		{
			try
			{
				request = new ActiveXObject('Microsoft.XMLHTTP');
			}
			catch(ee)
			{}
		}
		return request;
	}

function ajax_stop()
{
	for(var i=0; i<requests.length; i++)
	{
		if(requests[i] != null)
			requests[i].abort();
	}
}

function ajax_create_request(context)
{
	for(var i=0; i<requests.length; i++)
	{
		if(requests[i].readyState == 4)
		{
			requests[i].abort();
			requests[i].context = null;
			return requests[i];
		}
	}

	var pos = requests.length;
	
	requests[pos] = Object();
	requests[pos].obj = new XMLHttpRequest();
	requests[pos].context = context;
	
	return requests[pos];
}

function ajax_request(url, data, callback, context)
{
	var request = ajax_create_request(context);
	var async = typeof(callback) == 'function';
	if(async) request.obj.onreadystatechange = function()
	{
		if(request.obj.readyState == 4)
			callback(new ajax_response(request));
	}
	request.obj.open('POST', url, async);
	request.obj.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
	request.obj.send(data);
	if(!async)
		return new ajax_response(request);
}

function ajax_response(request)
{
	this.request = request.obj;
	this.error = null;
	this.value = null;
	this.context = request.context;
	if(request.obj.status == 200)
	{
		try
		{
			this.value = request.obj.responseText;
				
			if(this.value && this.value.error)
			{
				this.error = this.value.error;
				this.value = null;
			}
		}
		catch(e)
		{
			this.error = new ajax_error('??' + e.name, e.description, e.number);
		}
	}
	else
	{
		this.error = new ajax_error('HTTP request failed with status: ' + request.obj.status, request.obj.status);
	}
	
	return this;
}

function enc(s)
{
	return s.toString().replace(/\%/g, "%26").replace(/=/g, "%3D");
}

function ajax_error(name, description, number)
{
	this.name = name;
	this.description = description;
	this.number = number;

	return this;
}

function FallbackAPDAlert(message)
{
	try
	{
		// Uge a nice dialog if its present, otherwise, fallback to plain old javascript alert
	    var dialog = document.querySelector('#errordialog');
	    if (! dialog.showModal) 
	    {
	      dialogPolyfill.registerDialog(dialog);
	    }
	    var msgtxt = dialog.querySelector('#ErrorMessageText');
	    msgtxt.innerHTML = message;
	    dialog.querySelector('button:not([disabled])').addEventListener('click', function() {
	      dialog.close();
	    });

	   dialog.showModal();

	}
	catch(err)
	{
		alert(message);
	}
}

APDAlert = FallbackAPDAlert;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Navision Support

function APD_GetAction(action,parms) // TODO
{
	Rsp = ajax_request(RootLocation + '?action='+action+'&'+parms+'&'+encodeURI(window.location.search.substring(1)),'',true,null);
	return Rsp.value;
	/*
    if (Rsp.value.slice(0,5) == 'HTML ')
    {
		return new String(Rsp.value.slice(5));
    }
    */
}

function APD_Empty(form)
{
}

var xRecValue;

// Can by assigned by a page to be executed after a successfull validate command ......
var ExtraValidateFunction = APD_Empty;

function APD_GetValue(form,d)
{
	switch(form.elements[d].type.toString())
	{
		case "checkbox":
			return form.elements[d].checked.toString();
			break;
		case "select-one":
			if (form.elements[d].selectedIndex < 0)			
				return '';
			return form.elements[d].options[form.elements[d].selectedIndex].value;						
			break;
		default:
            if (form.elements[d].value.toString().length > 2048)
                return form.elements[d].value.toString().slice(0,2048);
            else
			    return form.elements[d].value.toString();
			break;
	}
}

function APD_SetValue(form,d,v)
{	
	switch(form.elements[d].type.toString())
	{
		case "checkbox":
			if (v == '1')
				form.elements[d].checked = true;
			else
				form.elements[d].checked = false;
			break;
		case "select-one":
		    if (typeof(v) == 'int')
				  form.elements[d].selectedIndex = parseInt(v);
		    else
		    {			
			for(i = 0; i < form.elements[d].options.length;i++)
			{				
				if (v == form.elements[d].options[i].value)
				{
					form.elements[d].selectedIndex = form.elements[d].options[i].index;
					return;
				}
			}
		    }
		break;
	        default:
			form.elements[d].value = v;
			break;
	}
}

function APD_GetSingleValue(Table,Field)
{
	var i,d;
	var SearchName = Table.toString()+':'+Field.toString();
	for (i = 0; i < document.forms.length; i++)
		for (d = 0; d < document.forms[i].length; d++)
			if (document.forms[i].elements[d].name != null)
				if (document.forms[i].elements[d].name == SearchName)
					return APD_GetValue(document.forms[i],d);
				
	return null;
}

function APD_Refresh(table,InputForm)
{
	ViewString = 'undefined';
	step = '=';
	var data = "";
	var d;    
    var Rsp;
	var FirstField = true;
	//document.body.style.cursor = "wait";
    for (d = 0; d < InputForm.length; d++)
    {
		var CheckTablePos = InputForm.elements[d].name.indexOf(":");
		var CheckTable = "";
		if ( CheckTable != -1)
		{
			CheckTable = InputForm.elements[d].name.slice(0,CheckTablePos);
			if (CheckTable == table.toString()) 
			{
				if (!FirstField)
					data = data + '&';
				data = data + InputForm.elements[d].name + '=' + encodeURIComponent(APD_GetValue(InputForm,d));
				FirstField = false;
			}
		}
	}
	Rsp = ajax_request(RootLocation + '?ajax=find&Table='+table+'&Step='+encodeURIComponent(step)+'&View='+encodeURIComponent(ViewString)+'&'+encodeURI(window.location.search.substring(1)),data,true,null);
    if (Rsp.value.slice(0,5) == 'DATA1')
    {
        // The Record comes back
        bg = new String(Rsp.value.slice(5));
        split = bg.split("&");
        getvar = new Object();
        for(i= 0; i < split.length; i++)
        {
            bg = new String(split[i]);
            vaerdi = bg.split("=");
            getvar[vaerdi[0]] = decodeURIComponent(vaerdi[1]);
        }
        for (d = 0; d < InputForm.length; d++)
		{
			var CheckTablePos = InputForm.elements[d].name.indexOf(":");
			var CheckTable = "";
			if ( CheckTable != -1)
			{
				CheckTable = InputForm.elements[d].name.slice(0,CheckTablePos);
				if (CheckTable == table.toString()) 
					APD_SetValue(InputForm,d,getvar[InputForm.elements[d].name]);
			}
		}
		document.body.style.cursor = "default";
		return true;
    }
    else
        if (Rsp.value.slice(0,5) == 'ERROR')
           APDAlert(Rsp.value.slice(5));
        else
            if (Rsp.value.slice(0,5) == 'EMPTY')
            {
            	document.body.style.cursor = "default";
				return false;
            }
			else
				APDAlert('Unknown Navision Ajax response (#2) ('+Rsp.value+')');
	document.body.style.cursor = "default";
}

function APD_validate(entry,table,field)
{
  	errorCode = 0;
	var data = "";
	var i,d;    
	var Rsp;
	var form = entry.form;
	var Message = 0;
	var field_d;
	var xxRecValue;
	if (xRecValue != null)
		xxRecValue = xRecValue;
	//document.body.style.cursor = "wait";
	for (d = 0; d < form.length; d++)
	{
		if (form.elements[d].name != null)
		{
			if (form.elements[d].name.slice(0,table.toString().length + 1) == table.toString()+':')
			{
				if (d > 0)
						data = data + '&';
				data = data + form.elements[d].name + '=' + encodeURIComponent(APD_GetValue(form,d));
				if (form.elements[d].name == table.toString()+':'+field.toString())
				field_d = d;
			}
		}
	}
    if (typeof(globalField_d != undefined) && (globalField_d != null))
      globalField_d = table.toString()+':'+field.toString(); 
 
	Rsp = ajax_request(RootLocation + '?ajax=validate&Table='+table+'&Field='+field+'&'+encodeURI(window.location.search.substring(1)),data,true,null);
	if (Rsp.value.slice(0,5) == 'DATA1')
    {
        // The Record comes back
        bg = new String(Rsp.value.slice(5));
        split = bg.split("&");
        getvar = new Object();
        for(i= 0; i < split.length; i++)
        {
            bg = new String(split[i]);
            vaerdi = bg.split("=");
            getvar[vaerdi[0]] = decodeURIComponent(vaerdi[1]);
            if (vaerdi[0] == "_MESSAGE")
                Message = 1;
        }
			for (d = 0; d < form.length; d++)
			{
				if (form.elements[d].name != null)
				{
				if (typeof(getvar[form.elements[d].name]) != 'undefined')
					APD_SetValue(form,d,getvar[form.elements[d].name]);
					if (Message == 1)
					{
						var msg = getvar["_MESSAGE"];
						msg = msg.replace(/\x2B/g," ");
						msg = msg.replace(/\\/g,"\n");
						msg = msg.replace(/%2c/g,","); 
						APDAlert(msg);
					}
				}
			}
			ExtraValidateFunction(form);
    }
    else
        if (Rsp.value.slice(0,5) == 'ERROR')
        {
		errorCode = 1;
		APDAlert(Rsp.value.slice(5));
		if(xxRecValue != null)
		{
			APD_SetValue(form,field_d,xxRecValue.toString());
			if(form.elements[field_d].type.toString() == "text")
				form.elements[field_d].focus();
		}
		document.body.style.cursor = "default";
		return;
        }
        else
        {
		errorCode = 1;
		APDAlert('Communication error, try again.');
		if(xxRecValue != null) 
		{
			APD_SetValue(form,field_d,xxRecValue.toString());
			if(form.elements[field_d].type.toString() == "text")
				form.elements[field_d].focus();
		}
		document.body.style.cursor = "default";
		return;
        }            
}

function APD_Find(table,step,ViewString,InputForm,OutputForm)
{
	var data = "";
	var i,d;    
    var Rsp;
	var FirstField = true;
	//document.body.style.cursor = "wait";
	for (i = 0; i < document.forms.length; i++)
	{
        for (d = 0; d < document.forms[i].length; d++)
        {
			var CheckTablePos = document.forms[i].elements[d].name.indexOf(":");
			var CheckTable = "";
			if ( CheckTable != -1)
			{
				CheckTable = document.forms[i].elements[d].name.slice(0,CheckTablePos);
				if (CheckTable == table.toString()) 
				{
					if (OutputForm)
					{
						if (document.forms[i].name == InputForm)
						{
							if (!FirstField)
								data = data + '&';
							data = data + document.forms[i].elements[d].name + '=' + encodeURIComponent(APD_GetValue(document.forms[i],d));
							FirstField = false;
						}
					}
					else
					{
						if (!FirstField)
							data = data + '&';
						data = data + document.forms[i].elements[d].name + '=' + encodeURIComponent(APD_GetValue(document.forms[i],d));
						FirstField = false;
					}
				}
			}
        }
	}
	Rsp = ajax_request(RootLocation + '?ajax=find&Table='+table+'&Step='+encodeURIComponent(step)+'&View='+encodeURIComponent(ViewString)+'&'+encodeURI(window.location.search.substring(1)),data,true,null);
    if (Rsp.value.slice(0,5) == 'DATA1')
    {
        // The Record comes back
        bg = new String(Rsp.value.slice(5));
        split = bg.split("&");
        getvar = new Object();
        for(i= 0; i < split.length; i++)
        {
            bg = new String(split[i]);
            vaerdi = bg.split("=");
            getvar[vaerdi[0]] = decodeURIComponent(vaerdi[1]);
        }
    	for (i = 0; i < document.forms.length; i++)
            for (d = 0; d < document.forms[i].length; d++)
			{
				var CheckTablePos = document.forms[i].elements[d].name.indexOf(":");
				var CheckTable = "";
				if ( CheckTable != -1)
				{
					if (OutputForm)
					{
						if (document.forms[i].name == OutputForm)
						{
							CheckTable = document.forms[i].elements[d].name.slice(0,CheckTablePos);
							if (CheckTable == table.toString()) 
								APD_SetValue(document.forms[i],d,getvar[document.forms[i].elements[d].name]);
						}
					}
					else
					{
						CheckTable = document.forms[i].elements[d].name.slice(0,CheckTablePos);
						if (CheckTable == table.toString()) 
							APD_SetValue(document.forms[i],d,getvar[document.forms[i].elements[d].name]);
					}
				}
			}
		document.body.style.cursor = "default";
		return true;
    }
    else
        if (Rsp.value.slice(0,5) == 'ERROR')
           APDAlert(Rsp.value.slice(5));
        else
            if (Rsp.value.slice(0,5) == 'EMPTY')
            {
            	document.body.style.cursor = "default";
				return false;
            }
			else
				APDAlert('Unknown NAV Ajax response (#2) ('+Rsp.value+')');
	document.body.style.cursor = "default";
}

function APD_Focus(entry,table,field)
{
  var i,d;
	if (entry != null) 
	{
		if (entry.form != null)
		{
			var form = entry.form;
			for (d = 0; d < form.length; d++)
			{
				if (form.elements[d].name != null)
				{		
					if (form.elements[d].name == table.toString()+':'+field.toString())
						xRecValue = APD_GetValue(form,d);
				}
			}
		}
	}
}

function APD_CreateViewString(ParentTableNo,ViewString)
{
	// 
	var NewString = "";
	var i,d;
	
	for (i = 0; i < ViewString.length; i++)
	{
		if (ViewString.substring(i,i+1) == '?')
		{
			var FieldString = "";
			for (i++; i < ViewString.length && ViewString.substring(i,i+1) != '?'; i++)
				FieldString = FieldString + ViewString.substring(i,i+1);
			NewString = NewString + '0('+APD_GetSingleValue(ParentTableNo,FieldString)+')';
		}
		else
			NewString = NewString + ViewString.substring(i,i+1);
	}
	return NewString;
}
function APD_FillLines(TableNo,ParentTableNo,ViewString)
{
	var i,d;
	var VS = APD_CreateViewString(ParentTableNo,ViewString);
	var FirstSearch = true;
	var MoreRecords = true;
	//while(1)
	//document.body.style.cursor = "wait";
	for (i = 0; i < document.forms.length; i++)
	{
		var Form = document.forms[i];
		var CheckTablePos = Form.name.indexOf(":");
		var CheckTable = "";
		if ( CheckTable != -1)
		{
			CheckTable = Form.name.slice(0,CheckTablePos);
			if (CheckTable == TableNo.toString()) 
			{
				if (!MoreRecords)
					Form.reset();
				else
				{
					if (FirstSearch)			
					{
						if (!APD_Find(TableNo,'-',VS,document.forms[i].name,document.forms[i].name))
						{
							MoreRecords = false;
							Form.reset();
						}
						FirstSearch = false;
					}
					else
						if (!APD_Find(TableNo,'>',VS,document.forms[i - 1].name,document.forms[i].name))
						{
							MoreRecords = false;
							Form.reset();
						}
				}
			}
		}
	}
	//document.body.style.cursor = "default";
}

function APD_GetValueFromQueryString(Parm)
{
    bg = new String(window.location.search.slice(1));
    split = bg.split("&");
    getvar = new Object();
    for(i= 0; i < split.length; i++)
    {
        bg = new String(split[i]);
        vaerdi = bg.split("=");
        getvar[vaerdi[0]] = decodeURIComponent(vaerdi[1]);
    }
    return getvar[Parm];
}

function APD_ShowError()
{
    var msg = new String(APD_GetValueFromQueryString("_ERRORMESSAGE"));
    msg = msg.replace(/\x2B/g," ");
    APDAlert(msg);
}

if (window.location.search.search("_ERRORMESSAGE") != -1)
    setTimeout(APD_ShowError,1000);

function APD_Insert(entry,table)
{
	var data = "";
	var i,d;    
    var Rsp;
	var form = entry;
    var Message = 0;
	//document.body.style.cursor = "wait";
	for (d = 0; d < form.length; d++)
	{
		if(form.elements[d].name != null)
		{
			if (form.elements[d].name.slice(0,table.toString().length + 1) == table.toString()+':')
			{
				if (d > 0)
						data = data + '&';
				data = data + form.elements[d].name + '=' + encodeURIComponent(APD_GetValue(form,d));
			}
		}
	}
	Rsp = ajax_request(RootLocation + '?ajax=insert&Table='+table+'&'+encodeURI(window.location.search.substring(1)),data,true,null);
    if (Rsp.value.slice(0,5) == 'DATA1')
    {
        // The Record comes back
        //alert(Rsp.value.slice(100));
        bg = new String(Rsp.value.slice(5));
        split = bg.split("&");
        getvar = new Object();
        for(i= 0; i < split.length; i++)
        {
            bg = new String(split[i]);
            vaerdi = bg.split("=");
            getvar[vaerdi[0]] = decodeURIComponent(vaerdi[1]);
            if (vaerdi[0] == "_MESSAGE")
                Message = 1;
        }
			for (d = 0; d < form.length; d++)
			{
				if (form.elements[d].name != null)
				{
				//form.elements[d].value = getvar[form.elements[d].name];
					if (typeof(getvar[form.elements[d].name]) != 'undefined')
						APD_SetValue(form,d,getvar[form.elements[d].name]);
					if (Message == 1)
					{
							var msg = getvar["_MESSAGE"];
							msg = msg.replace(/\x2B/g," "); 
							APDAlert(msg);
					}
				}
			}
    }
    else
        if (Rsp.value.slice(0,5) == 'ERROR')
        {
           APDAlert(Rsp.value.slice(5));
        }
        else
            APDAlert('Unknown NAV Ajax response (#3) ('+Rsp.value+')');
	//document.body.style.cursor = "default";
}

function APD_Modify(entry,table)
{
	var data = "";
	var i,d;    
    var Rsp;
	var form = entry;
    var Message = 0;
	//document.body.style.cursor = "wait";
	for (d = 0; d < form.length; d++)
	{
		if (form.elements[d].name != null)
		{
			if (form.elements[d].name.slice(0,table.toString().length + 1) == table.toString()+':')
			{
				if (d > 0)
						data = data + '&';
				data = data + form.elements[d].name + '=' + encodeURIComponent(APD_GetValue(form,d));
			}
		}
	}
	Rsp = ajax_request(RootLocation + '?ajax=modify&Table='+table+'&'+encodeURI(window.location.search.substring(1)),data,true,null);
    if (Rsp.value.slice(0,5) == 'DATA1')
    {
        // The Record comes back
        //alert(Rsp.value.slice(100));
        bg = new String(Rsp.value.slice(5));
        split = bg.split("&");
        getvar = new Object();
        for(i= 0; i < split.length; i++)
        {
            bg = new String(split[i]);
            vaerdi = bg.split("=");
            getvar[vaerdi[0]] = decodeURIComponent(vaerdi[1]);
            if (vaerdi[0] == "_MESSAGE")
                Message = 1;
        }
				for (d = 0; d < form.length; d++)
				{
					//form.elements[d].value = getvar[form.elements[d].name];
					if (form.elements[d].name != null)
					{
						if (typeof(getvar[form.elements[d].name]) != 'undefined')
						APD_SetValue(form,d,getvar[form.elements[d].name]);
						if (Message == 1)
						{
								var msg = getvar["_MESSAGE"];
								msg = msg.replace(/\x2B/g," "); 
								APDAlert(msg);
						}
					}
				}
    }
    else
        if (Rsp.value.slice(0,5) == 'ERROR')
        {
           APDAlert(Rsp.value.slice(5));
        }
        else
            APDAlert('Unknown NAV Ajax response (#4) ('+Rsp.value+')');
	//document.body.style.cursor = "default";
}

// Lookup fields!
function APD_Lookup(TableNo,FieldNo,LookupTableNo,LookupFieldNo,DescriptionFieldNo,entry)
{
    window.self.name='APD';
	var data = '';
	var form;
	var node = entry;
	while (node.form == null && node.parentNode) 
	{
    	node = node.parentNode;
	}
    if (node.form != null)
    {
	  form = node.form;
		for (d = 0; d < form.length; d++)
		{
			if (form.elements[d].name != null)
			{
				if (form.elements[d].name.slice(0,TableNo.toString().length + 1) == TableNo.toString()+':')
				{
					if (d > 0)
							data = data + '&';
					data = data + form.elements[d].name + '=' + encodeURIComponent(APD_GetValue(form,d));
				}
			}
		}
	}
    LookupWindow=window.open("?action=lookup&_WINDOW="+window.self.name+
                                      "&_PTABLE="+TableNo.toString()+
                                      "&_PFIELD="+FieldNo.toString()+
                                      "&_TABLE="+LookupTableNo.toString()+
                                      "&_FIELD="+LookupFieldNo.toString()+
                                      "&_FIELD2="+DescriptionFieldNo.toString()+
									  "&"+data.toString()
                                      ,
                          "APDSELECT", 'dependent,scrollbars=no,width=500,height=430,innerheight=430,innerwidth=500');     
    LookupWindow.focus();	
 }

function APD_LookupReturn(Value)
{
	var ptable = APD_GetValueFromQueryString("_PTABLE");
	var pfield = APD_GetValueFromQueryString("_PFIELD");
	var pwin = window.opener;
    var attr;
    var w,i,d,a;
    self.blur()
    for (w = 0; w < pwin.document.forms.length; w++)
        for (i = 0; i < pwin.document.forms[w].length; i++)
					if (pwin.document.forms[w].elements[i].name != null)
					{
            if (pwin.document.forms[w].elements[i].name == ptable.toString()+":"+pfield.toString())
            {
                d = i;        
                xRecValue = pwin.document.forms[w].elements[d].value;
                APD_SetValue(pwin.document.forms[w],d,Value);
                attr = pwin.document.forms[w].elements[d].attributes;
                for (a = 0; a < attr.length; a++)
                {
                    if (attr[a].name == "onchange")
					  if (attr[a].value.toString() != "null")
                        if (attr[a].value.toString().slice(0,8) == 'Navision')
                            APD_validate(pwin.document.forms[w].elements[d],ptable,pfield);
                }
                self.close();
                return;
            }
					}
    self.close();
}


function APD_Press_Key(e)
{
    if (e == null)
    {
        // Internet Explorer
        if (event.keyCode == 27)
            event.returnValue = false;            
    }
    else
    {
        // Netscape
        if (e.charCode == 27)
            e.preventDefault();
    }
}

function APD_UseDatePicker(control)
{
  __dialog = new mdDateTimePicker.default({type: 'date',past: moment(),future: moment().add(10, 'years') });
  __dialogowner = control;
  __dialog.trigger = __dialogowner;
  try{
  __dialogowner.removeEventListener('onOk',datepicker_onOk);
  } catch(Err) {}
  __dialogowner.addEventListener('onOk',datepicker_onOk);
  __dialog.toggle();
}
function datepicker_onOk()
{
  	__dialogowner.value = __dialog.time.format('MM/DD/YY');
}

function APD_Set(key,value)
{
    Rsp = ajax_request(RootLocation + '?ajax=setvalue&key=' + encodeURIComponent(key) + '&value=' + encodeURIComponent(value));
    if (Rsp.value.slice(0,7) == 'DATA1OK')
        return true;
    return false;
}

function APD_Get(key)
{
    Rsp = ajax_request(RootLocation + '?ajax=getvalue&key=' + encodeURIComponent(key));
    if (Rsp.value.slice(0,5) == 'DATA1')
        return Rsp.value.slice(5);
    return null;
}
function APD_Has(key)
{
    Rsp = ajax_request(RootLocation + '?ajax=getvalue&key=' + encodeURIComponent(key));
    if (Rsp.value.slice(0,5) == 'DATA1')
        return true;
    return false;
}
 

document.onkeydown= APD_Press_Key;

