/**
*  Module: socketio module
* Description: module that wraps the socketio library,
  requires the library to be added and backend integration
*/
var module= angular.module('socket.io', []);

module.factory('socket', ['$rootScope', '$location',
	function ($rootScope, $location) {
		var sock;
		var listeners= {};
		return {
			init: function () {
				if(!sock){
					console.log('creating socket');
					sock= io({'forceNew': true});
				}
			},
			on: function (eventName, callback) {
				if(!!sock && !listeners[eventName]){
					sock.on(eventName, function () {
						var args = arguments;
						$rootScope.$apply(function (){
							callback.apply(sock, args);
						});
						listeners[eventName]= true;
					});
				}
			},
			emit: function (eventName, data, callback) {
				if(!!sock){
					sock.emit(eventName, data, function() {
						var args= arguments;
						$rootScope.$apply(function () {
							if(!!callback){
								callback.apply(sock, args);
							}
						});
					});
				}
			},
			disconnect: function(){
				if(!!sock){
					sock.disconnect();
					sock= null;
					listeners= {};
				}
			}
		};
}]);
