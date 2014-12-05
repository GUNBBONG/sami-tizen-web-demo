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
var CLIENT_ID = '93e7bb238bf148f2aa2c9844d3a0839e';
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

function saveTokenInfo(token) {
	localStorage.setItem('token', JSON.stringify(token));
}
function getTokenInfo() {
	return JSON.parse(localStorage.getItem('token'));
}
function deleteTokenInfo() {
	localStorage.removeItem('token');
}

function initApp() {
	tau.defaults.pageTransition = "slideup";

	$('#exitBtn').click(function () {
		console.log('click exitBtn');
		tizen.application.getCurrentApplication().exit();
	});
	$('#signInIframeBtn').click(function () {
		console.log('click signInIframeBtn');
		signInFrameOpen();
	});

	$('#useRegisteredDeviceBtn').click(function () {
		tau.changePage('#deviceInfoPage');
	});
	
	$('#registerDeviceBtn').click(function () {
		console.log('click registerDeviceBtn');
		registerDevice();
	});
	
	$('#sendMsgBtn').click(function () {
		console.log('click sendMsgBtn');
		sendMsg();
	});
	
	$('#welcomePage').on('pagebeforeshow', function (ev) {
		console.log('welcomePage pagecreate');
		$('#userinfo').html('Hello! ' + USERINFO.fullName);
		// TODO generate and set default device name
	});
	
	$('#deviceInfoPage').on('pagecreate', function (ev) {
		console.log('deviceInfoPage pagecreate');
		var deviceInfo = getDeviceInfo();
		console.log('getDeviceInfo', deviceInfo);
		$('#deviceinfo').html('Device Name: ' + deviceInfo.name);
	});
	
	initSwaggerSpec(function () {
		var tokenInfo = getTokenInfo();
		if (tokenInfo) {
			initWithAccessToken(tokenInfo.accessToken, function () {
				$('#registeredDeviceContent').css('display', 'block');
			});
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
				tau.changePage('#welcomePage');
			});
		}
	});
	tau.changePage('#loginPage');
}

function updateToken(deviceId, callback) {
	swagger.devices.updateDeviceToken({deviceId: deviceId, body: '{}'}, function (result) {
		console.log('updateToken', result);
		var tokenInfo = result.obj.data;
		callback(tokenInfo);
	});
}
function registerDevice() {
	// TODO validate device name.  Between 5 and 36 characters.
	var deviceName = $('#deviceNameInput').val();
	var bodyObj = {
			uid: USERINFO.id,
			dtid: DEVICE_TYPE_ID,
			name: deviceName,
			manifestVersion: 1,
			manifestVersionPolicy: 'DEVICE'
			};
	var bodyStr = JSON.stringify(bodyObj);
	console.log('register device', bodyObj, bodyStr);
	swagger.devices.addDevice({device: bodyStr}, function (result) {
		console.log('addDevice', arguments);
		var deviceInfo = result.obj.data;
		saveDeviceInfo(deviceInfo);
		updateToken(deviceInfo.id, function (tokenInfo) {
			saveTokenInfo(tokenInfo);
			tau.changePage('#deviceInfoPage');
		});
	});
}
function sendMsg() {
	var deviceInfo = getDeviceInfo();
	var nowTs = Date.now();
	var randomEcg = parseInt(Math.random() * 200 - 100);
	var body = {
			sdid: deviceInfo.id,
			data: '{"dateMicro":' + (nowTs * 1000) + ',"ecg":' + randomEcg + '}',
			ts: nowTs};
	var bodyStr = JSON.stringify(body);
	swagger.messages.postMessage({message: bodyStr}, function (result) {
		console.log('postMessage', result);
		toast('msg sent');
		toastClose(500);
	});
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

