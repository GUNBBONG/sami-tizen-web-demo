( function () {
	window.addEventListener( 'tizenhwkey', function( ev ) {
		if( ev.keyName == "back" ) {
			var page = document.getElementsByClassName( 'ui-page-active' )[0],
				pageid = page ? page.id : "";
			if( pageid === "main" ) {
				try {
					tizen.application.getCurrentApplication().exit();
				} catch (ignore) {
				}
			} else {
				window.history.back();
			}
		}
	} );
} () );

// Fill these values according to the registered SAMI application
var CLIENT_ID = '5d8585e679cb41cb9b3f6eaf166b3e41';
var REDIRECT_URI = 'https://accounts.samsungsami.io';
var DEVICE_TYPE_ID = 'vitalconnect_module';

var ACCESS_TOKEN;
var USERINFO;
var DEVICES;

function saveDeviceInfo(device) {
	localStorage.setItem('device', JSON.stringify(device));
}
function getDeviceInfo() {
	return JSON.parse(localStorage.getItem('device'));
}
function deleteDeviceInfo() {
	localStorage.removeItem('device');
}

function initApp() {
	tau.defaults.pageTransition = "slideup";
	
	initSwaggerSpec();

	$('#exitBtn').click(function () {
		console.log('click exitBtn');
		tizen.application.getCurrentApplication().exit();
	});
	
	$('#signInIframeBtn').click(function () {
		console.log('click signInIframeBtn');
		signInFrameOpen();
	});
	
	$('#newDeviceBtn').click(function () {
		tau.changePage('#deviceSelectPage');
	});
	
	$('#useConnectedDeviceBtn').click(function () {
		tau.changePage('#messagesPage');
	});
	
	$('#welcomePage').on('pagebeforeshow', function (ev) {
		console.log('welcomePage pagecreate');
		$('#userinfo').html('Hello! ' + USERINFO.fullName);
		var device = getDeviceInfo();
		if (device) {
			$('#deviceinfoMsg').html('Device "' + device.name + '" is connected');
			$('#deviceinfo').show();
		} else {
			$('#deviceinfo').hide();
		}
	});
	
	$('#deviceSelectPage').on('pagecreate', function (ev) {
		console.log('deviceSelectPage pagecreate');
		function getHandler(device) {
			return function () {
				console.log('click ' + device.name);
				saveDeviceInfo(device);
				tau.changePage('#messagesPage');
				toast('Device "' + device.name + '" is connected');
				toastClose(1000);
			}
		}
		for (var key in DEVICES) {
			var device = DEVICES[key];
			console.log(device);
			if (device.dtid === DEVICE_TYPE_ID) {
				var deviceName = device.name; 
				console.log(deviceName);
				var deviceElement = $('<li><a class="ui-list-icon option-icon-action" href="#">' + deviceName + '</a></li>');
				deviceElement.on('click', getHandler(device));
				$('#deviceSelectPage ul').append(deviceElement);	
			}
		}
	});
	
	$('#messagesPage button').on('click', function () {
		toast('Messages are updated');
		toastClose(1000);
		updateMessages(); 
	});
	
	$('#messagesPage').on('pagebeforeshow', function (ev) {
		updateMessages();
	});
}

function updateMessages() {
	var device = getDeviceInfo();
	var query = {sdids: device.id, count: 20};
	
	$('#messagesPage ul').html('');
	$('#messagesPage .note').html('Messages from ' + device.name);
	swagger.messages.getLastNormalizedMessages(query, function (result) {
		console.log('getLastNormalizedMessages', result);
		var messages = result.obj.data;
		for(var key in messages) {
			var msg = messages[key];
			$('#messagesPage ul').prepend('<li>' + JSON.stringify(msg.data) + '</li>');
		}
	});
}

function signInFrameOpen() {
	var loginFrm = $('#loginFrm');
	loginFrm.attr('src', getAuthUrl());
	loginFrm.on('load', function (e) {
		var url = e.target.contentWindow.location.href;
		console.log('signInFrame load', url);
		
		
		// TOREMOVE: auto login for test
		if (url.indexOf('https://account.samsung.com/account/check.do') != -1) {
			$('#inputUserID', loginFrm.contents()).val('supermaneesh@gmail.com');
			$('#inputPassword', loginFrm.contents()).val('Sam1hub!');
			//$('input[type="submit"]', loginFrm.contents()).click();
		}

		
		if (url.indexOf('access_token') != -1) {
			var fragmentObj = URI.parseQuery(URI(url).fragment());
			console.log('fragmentObj', fragmentObj);
			initWithAccessToken(fragmentObj.access_token, function () {
				swagger.users.getUserDevices({userId: USERINFO.id}, function (result) {
					console.log('users.getUserDevices', result);
					DEVICES = result.obj.data.devices;
					tau.changePage('#welcomePage');
				});
			});
		}
	});
	tau.changePage('#loginPage');
}

function getSpec(cb) {
	$.get('./sami-spec/spec.json', function (response) {
		var spec = JSON.parse(response);
		cb(spec);
	});
}
function initSwaggerSpec(cb) {
	getSpec(function (spec) {
		window.swagger = new SwaggerClient({
			url: "./sami-spec/spec.json",
			spec: spec,
			debug: true,
			success: function() {
				console.log('SwaggerApi success');
				if(swagger.ready === true) {
					console.log('swagger ready');
				}
				if (cb) {
					cb();
				}
			}
		});
	});
}
function getAuthUrl() {
	var authUrl = 'https://accounts.samsungsami.io/authorize';
	authUrl = authUrl + '?client_id=' + CLIENT_ID + '&response_type=token&redirect_uri=' + REDIRECT_URI +'&scope=read,write';
	console.log('signIn url: ' + authUrl);
	return authUrl;
}
function initWithAccessToken(accessToken, callback) {
	console.log('initWithAccessToken', accessToken);
	ACCESS_TOKEN = accessToken;
	window.authorizations.add("api_key", new ApiKeyAuthorization("Authorization", "Bearer " + accessToken, "header"));
	swagger.users.self({}, function (result) {
		console.log('users.self', result);
		USERINFO = result.obj.data;
		callback();
	});
}
function toast(msg) {
	$('#popupToast .ui-popup-content').html(msg);
	tau.openPopup('#popupToast');
}
function toastClose(waitMillis) {
	setTimeout(function () {
		tau.closePopup();
	}, waitMillis);
}
$(function () {
	initApp();
});

