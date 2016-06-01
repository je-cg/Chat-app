var app= angular.module("chatapp", ["ngRoute", "socket.io", "ngMaterial"])
.config(["$routeProvider", "$locationProvider", "$httpProvider", "$mdThemingProvider",
	function ($routeProvider, $locationProvider, $httpProvider, $mdThemingProvider) {
	$routeProvider.otherwise({
        redirectTo: '/dashboard'
      });

	$routeProvider.when("/login", {
			templateUrl: "/login.html"
		});
	$routeProvider.when("/dashboard", {
			templateUrl: "/dashboard",
			controller: "dashboardCtrl"
		});

	$locationProvider.html5Mode(true);
    $httpProvider.interceptors.push('redirectinterceptor');

    $mdThemingProvider.definePalette('Chatpallet', {"50":"#ecf4f9","100":"#c6deec","200":"#a0c9e0","300":"#80b6d6","400":"#61a4cb","500":"#4192c1","600":"#3980a9","700":"#316e91","800":"#295b79","900":"#214961","A100":"#c6deec","A200":"#a0c9e0","A400":"#61a4cb","A700":"#316e91"});
	$mdThemingProvider.theme('default')
	.primaryPalette('Chatpallet')
	.accentPalette('indigo');

}]);
app.factory('redirectinterceptor', ["$q", "$location", function ($q, $location){
	console.log('interceptor executed');
	var redirectinterceptor= {
		responseError: function (response) {
			console.log(response.data);
			console.log(response.status);
			console.log($location.path());
			if(response.data=="not authorized" || response.status==303){
				$location.path('/login');
				console.log('path changed');
				return $q.reject(response);
			}
			return response;
		},
		response: function(response){
			console.log(response.status);
			if(response.status==202){
				$location.path('/dashboard');
			}
			return response;
		}
	};
	return redirectinterceptor;
}]);
app.value("ConversationsVal", {});

app.factory("SessionService", function () {
	var sess= {
		addConv: function (conversation, participants, messages) {
			messages= messages || "";
			var convobj= {};
			convobj.participants= participants;
			convobj.strconv="<ul>"+messages;
			convobj.convclose="</ul>";
			// console.log("try to create conversation", contact);
			// sessionStorage['Conversations'][contact]= convobj;
			sessionStorage.setItem(conversation, JSON.stringify(convobj));
			// console.log("new conversation", sessionStorage[contact]);
		},
		getconv: function (contact) {
			var conv= JSON.parse(sessionStorage.getItem(contact));
			if(!!conv){
				return {
					participants: conv.participants,
					domconv: angular.element(conv.strconv+conv.convclose)
				};
			}
			else{
				return null;
			}
		},
		leaveConv: function (conversation, contact) {
			var conv= JSON.parse(sessionStorage.getItem(conversation));
			if(!!conv){
				conv.participants.splice(conv.participants.indexOf(contact), 1);
				sessionStorage.setItem(conversation, JSON.stringify(conv));
			}
		},
		append: function (msg, to) {
			var conv= JSON.parse(sessionStorage.getItem(to));;
			if(!!conv){
				conv.strconv+=msg;
				sessionStorage.setItem(to, JSON.stringify(conv));
			}
		},
		deleteconv: function (contact) {
			sessionStorage.removeItem(contact);
		},
		clear: function () {
			sessionStorage.clear();
		},
		conversations: function () {
			return Object.keys(sessionStorage);
		}
	};
	return sess;
});
app.factory('ConversationMannager', ['ConversationsVal', 'SessionService', function (ConversationsVal, SessionService) {
	
	var convdiv;
	console.log("conversations value", ConversationsVal);
	function CreateNewconv (contact, conversation, users) {
			if(!conversation){
				var convobj= {
					participants: []
				};
				if(!!users){
					convobj.participants= users;
				}
				else{
					convobj.participants.push(contact);
				}
				convobj.domconv= angular.element("<ul>");
				ConversationsVal[contact]= convobj;
				console.log("ConversationsVal", ConversationsVal);
				SessionService.addConv(contact, convobj.participants);
			}
			else{
				ConversationsVal[contact]= conversation;
			}

			return ConversationsVal[contact];
			console.log("creating conversation", ConversationsVal);
		}

	var convmannager= {
		openConversation: function (user, users) {
			if(!ConversationsVal[user]){
				var Conv = SessionService.getconv(user);
				if(!!Conv){
					// create conv takes user and a conversation, conv===undefined? create on both : create on Val
					return CreateNewconv(user,Conv);
				}
				else {
					return CreateNewconv(user, null, users);
				}
			}
		},
		Convappend: function (to, msg, from, users, scrible, mclass) {
			var str;
			if(!ConversationsVal[to]){
				if(!!users){
					CreateNewconv(to, null, users);
				}
				else{
					CreateNewconv(to);
				}
			}
			if(scrible){
				var img= new Image();
				img.src= msg;
				img.width= 140;
				img.height= 100;
				var message= angular.element('<li>');
				message.addClass(mclass);
				message.append("<span>"+from+":</span>");
				message.append(img);
				console.log('appending to converation', message);
				ConversationsVal[to].domconv.append(message);
				var msgstr= message.html();
				str="<li class='"+mclass+"'>"+msgstr+"</li>";
				console.log('appending to session', str);
				// SessionService.append(message.toString(), to);
			}
			else{
				from= from!== "" ? from+":" : "";
				str= "<li class='"+mclass+"'><span>"+from+"</span> "+msg+"</li>";
				ConversationsVal[to].domconv.append(str);
			}
			SessionService.append(str, to);
			convdiv= convdiv || angular.element(document.getElementById('conversations'));
			convdiv[0].scrollTop= convdiv[0].scrollHeight;
		},
		joinConv: function (contact, conversation) {
			var prevconv= ConversationsVal[conversation];
			if(prevconv.participants.indexOf(contact)===-1){
				prevconv.participants.push(contact)
			}
			ConversationsVal[conversation+"-"+contact]= prevconv;
			this.deleteConv(conversation);
			// this.switchConv(conversation+"-"+contact);
			SessionService.addConv(conversation+"-"+contact, prevconv.participants, ConversationsVal[conversation+"-"+contact].domconv.html());
			SessionService.deleteconv(conversation);
		},
		switchConv: function (next){
			convdiv= convdiv || angular.element(document.getElementById('conversations'));
			convdiv.empty();
			convdiv.append(ConversationsVal[next].domconv);
			convdiv[0].scrollTop= convdiv[0].scrollHeight;
		},
		deleteConv: function (contact) {
			delete ConversationsVal[contact];
		},
		getparticipants: function(conversation){
			return ConversationsVal[conversation].participants;
		},
		leaveConv: function (conversation, participant) {
			if(ConversationsVal[conversation]){
				ConversationsVal[conversation].participants.splice(
					ConversationsVal[conversation].participants.indexOf(participant), 1
					);
			}
			SessionService.leaveConv(conversation, participant);
		},
		clearAll: function () {
			ConversationsVal= {};
			SessionService.clear();
			convdiv= null;
			console.log("cleared", ConversationsVal);
		},
		findConv: function (str) {
			var conv_names= Object.keys(ConversationsVal);
			str= str.split("-").sort().join("-");
			var sorted_name;
			for(var i=0; i<conv_names.length; i++){
				sorted_name= conv_names[i].split("-").sort().join("-");
				if(sorted_name.indexOf(str)===0 && sorted_name.length===str.length){
					return conv_names[i];
				}
			}
			return null;
		},
		getConversations: function () {
			return SessionService.conversations();
		}
		
	};
	return convmannager;
}]);

app.factory("popupService", ["$http", function ($http) {
	var container= angular.element("<div class='popupContainer'></div>");
	var body= angular.element(document.body);
	body.append(container);
	container.addClass('empty');
	var popup;
	return {
		entered: function (contact) {
			container.removeClass('empty');
			popup= angular.element("<div class='popup entered'>"+contact+" logedin</div>");
			console.log("adding pop", popup);
			container.prepend(popup);
			setTimeout(function (pop){
				pop.remove();
				if(container.children().length===0){
					container.addClass('empty');
				}
			}, 3000, popup);
		},
		left: function (contact) {
			container.removeClass('empty');
			popup= angular.element("<div class='popup exited'>"+contact+" logedout</div>");
			container.prepend(popup);
			setTimeout(function (pop){
				pop.remove();
				if(container.children().length===0){
					container.addClass('empty');
				}
			}, 1500, popup);
		}
	}


}]);

app.controller('mainCtrl', ["$scope", "$http", function ($scope, $http) {
	$scope.log_reg= {};
	$scope.log_reg.sate= true;
	$scope.log_reg.sending= false;
	$scope.logreg= function(sendto){
		$scope.log_reg.sending= true;
		sendto= sendto || 'log';
		console.log($scope.log_reg.email);
		$http.post(sendto, {
			email: $scope.log_reg.email,
			password: $scope.log_reg.password
		}).success(function (data, status){
			
			console.log(data);
		}).error(function (data, status) {
			$scope.log_reg.sending= false;
		});
		sessionStorage.clear();
		$scope.log_reg.password="";
	};
	

	
}]);

app.controller('dashboardCtrl', ["$scope", "socket", "$http", "$templateCache", "$mdSidenav", "$mdDialog", "ConversationMannager", "popupService", function ($scope, socket, $http, $templateCache, $mdSidenav, $mdDialog, ConversationMannager, popupService) {
	console.log('controller executed');
	
	var entityMap = {
	    "&": "&amp;",
	    "<": "&lt;",
	    ">": "&gt;",
	    '"': '&quot;',
	    "'": '&#39;',
	    "/": '&#x2F;'
	};

	function escapeHtml(str) {
	    return str.replace(/[&<>"'\/]/g, function (s) {
	      return entityMap[s];
	    });
	}

	// start socket connection
	socket.init();
	
	
	// get contacts and requests
	socket.on('joined', function (obj) {
		// console.log(obj);
		$scope.contacts= obj.contact;
		$scope.friendrequests= obj.requests;
		$scope.email= obj.email;
		// console.log($scope.email);
		isReqboxEmpty();
		var existing= ConversationMannager.getConversations();
		for(var i=0; i< existing.length; i++){
			if(existing[i].indexOf("-")!==-1){
				$scope.contacts[existing[i].replace(".", "\uff0e")]= {
					email: existing[i],
					status: "online",
					confirmed: true,
					received: ""
				};
			}
		}
	});

	socket.on('chat', function (msg) {
		msg.to= msg.to.replace($scope.email, msg.from);
		msg.participants.splice(msg.participants.indexOf($scope.email),1,msg.from);
		var conversation= ConversationMannager.findConv(msg.to);
		msg.to= conversation!==null ? conversation : msg.to;
		ConversationMannager.Convappend(msg.to, msg.msg, msg.from, msg.participants, msg.scrible, "contact");
		// console.log("message received", msg);
		if(!$scope.contacts[msg.to.replace(".", "\uff0e")]){
			$scope.contacts[msg.to.replace(".", "\uff0e")]= {
				email: msg.to,
				status: "online",
				confirmed: true,
				received: ""
			}
		}
		if(msg.to !== $scope.selectedUser){
			$scope.contacts[msg.to.replace(".", "\uff0e")].received= "pending";
			// console.log($scope.contacts[msg.to.replace(".", "\uff0e")]);
		}
		
	});

	socket.on('leaveConv', function (Conv) {
		ConversationMannager.leaveConv(Conv.conversation, Conv.contact);
		ConversationMannager.Convappend(Conv.conversation, Conv.contact+" left the conversation", "");
	});

	socket.on('joinconversation', function (info) {
		info.participants.splice(info.participants.indexOf($scope.email), 1, info.from);
		if(info.contact===$scope.email){
			// console.log("executed", info.from, info.to);
			ConversationMannager.Convappend(info.to+"-"+info.from, "you just joined the conversation", "", info.participants);
			$scope.contacts[(info.to+"-"+info.from).replace(".", "\uff0e")]= {
				email: info.to+"-"+info.from,
				status: 'online',
				confirmed: true,
				received: "pending"
			};
		}
		else{
			info.to= info.to.replace($scope.email, info.from);
			// console.log("info.to= ", info.to);
			ConversationMannager.openConversation(info.to, info.participants);
			ConversationMannager.joinConv(info.contact, info.to);
			ConversationMannager.Convappend(info.to+"-"+info.contact, info.contact+" joined the conversation", "", info.participants);
			if(info.to.indexOf("-")!==(-1)){
				delete $scope.contacts[info.to.replace(".", "\uff0e")];
			}
			$scope.contacts[(info.to+"-"+info.contact).replace(".", "\uff0e")]= {
				email: info.to+"-"+info.contact,
				status: 'online',
				confirmed: true
			};
			if(info.to !== $scope.selectedUser){
				$scope.contacts[(info.to+"-"+info.contact).replace(".", "\uff0e")].received= "pending";
			}
		}
		
	});

	socket.on('added', function (contact) {
		$scope.contacts[contact.email.replace(".", "\uff0e")]= contact;
		$scope.adding= false;
		$scope.newcontact="";
		$mdDialog.hide();
	});

	socket.on('notfound', function(){
		console.log('notfound');
		$scope.adding= false;
	});

	socket.on('confirmed', function (req) {
		delete $scope.friendrequests[req.email.replace(".", "\uff0e")];
		$scope.contacts[req.email.replace(".", "\uff0e")]= req;
		isReqboxEmpty();
	});

	socket.on('entered', function (contact) {
		console.log('entered event triggered', contact);
		console.log('contacts', $scope.contacts[contact.email.replace(".", "\uff0e")]);
		$scope.contacts[contact.email.replace(".", "\uff0e")].status= 'online';
		// console.log($scope.contacts[contact.email].status);
		popupService.entered(contact.email);
	});

	socket.on('left', function (contact) {
		console.log('left event triggered', contact);
		console.log('contacts', $scope.contacts[contact.email.replace(".", "\uff0e")]);
		$scope.contacts[contact.email.replace(".", "\uff0e")].status= 'offline';
		// console.log($scope.contacts[contact.email].status);
		popupService.left(contact.email);
	});

	socket.on('request', function (req) {
		$scope.friendrequests[req.replace(".", "\uff0e")]= req;
		isReqboxEmpty();
	});



	$scope.requesticon= "notifications_none";

	$scope.selectedUser= false;

	$scope.adding= false;
  
	$scope.onlinef= 'online';

	$scope.selectContact= function (contact) {
		ConversationMannager.openConversation(contact.email);
		ConversationMannager.switchConv(contact.email);
		$scope.selectedUser= contact.email;
		// console.log(contact);
		contact.received= "";
	}

	function isReqboxEmpty() {
		
		var length= Object.keys($scope.friendrequests).length;
		
		if(length===0){
			$scope.requesticon= "notifications_none";
			$scope.reqboxEmpty= true;
			// console.log('executed', $scope.reqboxEmpty);
		}
		else{
			$scope.requesticon= "notifications_active";
			$scope.reqboxEmpty= false;
		}
	}

	$scope.sendmsg= function(data, to) {
		data= escapeHtml(data);
		var messageobj= {};
		messageobj.msg= data;
		messageobj.from= $scope.email;
		messageobj.to= to;
		messageobj.participants= ConversationMannager.getparticipants(to);
		messageobj.scrible= false;
		if($scope.contacts[to.replace(".", "\uff0e")].confirmed && $scope.contacts[to.replace(".", "\uff0e")].status==="online"){
			socket.emit('chat', messageobj);
			ConversationMannager.Convappend(to, data, $scope.email, null, false, "mine");
		}
		else{
			ConversationMannager.Convappend(to, "your friend is not online", "");
		}
		
		$scope.newmessage= "";
		// console.log("message sent to server", messageobj);
		
	};

	$scope.addfriend= function (contact) {
		// console.log(contact);
		if($scope.add_join==="add"){
			if(!$scope.contacts[contact.replace(".", "\uff0e")] || !$scope.contacts[contact.replace(".", "\uff0e")].confirmed){
				$scope.adding= true;
				socket.emit('addfriend', {
					email: contact,
					from: $scope.email
				});
			}
			else{
				$mdDialog.hide();
			}
		}
		if($scope.add_join==="join"){
			if(!!$scope.contacts[contact.replace(".", "\uff0e")]
				&& $scope.contacts[contact.replace(".", "\uff0e")].confirmed
				&& $scope.selectedUser.indexOf(contact)===-1){
				var obj= {};
				ConversationMannager.joinConv(contact, $scope.selectedUser);
				ConversationMannager.Convappend($scope.selectedUser+"-"+contact, contact+" joined the conversation", "");
				ConversationMannager.switchConv($scope.selectedUser+"-"+contact);
				obj.to= $scope.selectedUser;
				obj.from= $scope.email;
				obj.contact= contact;
				obj.participants= ConversationMannager.getparticipants($scope.selectedUser+"-"+contact);
				// console.log("paricipants", obj.participants);
				// console.log("to", obj.to);
				socket.emit('joinconversation', obj);
				$scope.selectedUser= $scope.selectedUser+"-"+contact;
				if($scope.selectedUser.indexOf("-")!==(-1)){
					delete $scope.contacts[$scope.selectedUser.replace(".", "\uff0e")];
				}
				$scope.contacts[($scope.selectedUser).replace(".", "\uff0e")]= {
					email: $scope.selectedUser,
					status: 'online',
					confirmed: true
				}
				$mdDialog.hide();
			}
			else{
				$mdDialog.hide();
			}
		}	
		$scope.newcontact="";
	};

	$scope.respond= function(req, conf){
		// console.log("respond request req", req);
		// console.log("respond request conf", conf);
		// console.log("from", $scope.email);
		socket.emit('req', {
			from: $scope.email,
			email: req,
			confirmed: conf
		});
		// request.remove();
	};

	$scope.logout= function(){
		$scope.log_reg.sending= false;
		var conversations= ConversationMannager.getConversations();
		var groupConvs= [];
		var to= [];
		for(var i=0; i<conversations.length; i++){
			if(conversations[i].indexOf("-")!==-1){
				// groupConvs.push(conversations[i]);
				to= ConversationMannager.getparticipants(conversations[i]);
				socket.emit("leaveConv", {
					contact: $scope.email,
					conversation: conversations[i],
					participants: to
				});
			}
		}
		$templateCache.removeAll();
		ConversationMannager.clearAll();
		socket.disconnect();
		$http.post('out');
	};

	$scope.toggleSidenav = function(menuId) {
		$mdSidenav(menuId).toggle();
	};

	$scope.showCanvas= function(event){
	    var parentel = angular.element(document.body);
	    $mdDialog.show({
	      parent: parentel,
	      targetEvent: event,
	      preserveScope: true,
	      scope: $scope,
	      templateUrl: 'canvas-dialog.html',
	       controller: canvasCtrl
	    });
	};

	function canvasCtrl ($scope, $mdDialog){
	    var canvas, ctx, rectcanvas;
	     $scope.tool= 'pencil';
	    angular.element(document).ready(function () {
	      	canvas= angular.element(document.getElementById('scrible'));
	      	ctx= canvas[0].getContext('2d');
	      	rectcanvas= canvas[0].getBoundingClientRect();
	    });
	    
	    $scope.canvasClear= function () {
	      ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
	    };
	    
	    $scope.startDrawing= function(event) {
	      var x= event.offsetX;
	      var y= event.offsetY;
	      ctx.beginPath();
	      ctx.moveTo(x, y);
	      $scope.drawing= true;
	    };
	    
	    $scope.draw= function (event) {
	      if($scope.drawing){
	        if($scope.tool==='eraser'){
	          ctx.strokeStyle= 'white';
	          ctx.lineWidth= 5;
	        }
	        else{
	          ctx.strokeStyle= 'black';
	          ctx.lineWidth= 2;
	        }
	        var x= event.offsetX;
	        var y= event.offsetY;
	        ctx.lineTo(x, y);
	        ctx.stroke();
	      }
	    };
	    
	    $scope.stopDrawing= function() {
	      $scope.drawing= false;
	    };
	    
	    $scope.sendScrible= function () {
			var Imgurl= canvas[0].toDataURL();
			var messageobj= {};
			messageobj.msg= Imgurl;
			messageobj.from= $scope.email;
			messageobj.to= $scope.selectedUser;
			messageobj.participants= ConversationMannager.getparticipants($scope.selectedUser);
			messageobj.scrible= true;
			socket.emit('chat', messageobj);
			ConversationMannager.Convappend($scope.selectedUser, Imgurl, $scope.email, null, true, "mine");
	        $mdDialog.hide();
	    };
	    
	  }

	$scope.closeCanvas= function() {
		$mdDialog.hide();
	};
  
    $scope.showDialog = function(event, flag) {
    	$scope.add_join= flag;
		var parentel= angular.element(document.body);
		$mdDialog.show({
			parent: parentel,
			preserveScope: true,
			targetEvent: event,
			scope: $scope,
			controller: function($scope, $mdDialog){
				$scope.closeDialog = function () {
					$scope.newcontact="";
					$mdDialog.hide();
				};
			},
			templateUrl: 'addfriend-dialog.html'
		});
	};
  
  
   

}]);


app.filter('Objfilterbyval', function () {
  return function (input, prop, val){
    if(!prop || !val){
      return input;
    }
    var result= {};
    angular.forEach(input, function(value, key){
      if(value[prop]==val){
        result[key]=value;
      }
    });
    return result;
  };
});

app.filter('ObjpropHasStr', function () {
  return function(input, prop, str){
    if(!prop || !str || str===""){
      return input;
    }
    var results= {};
    angular.forEach(input, function(value, key){
      if(value[prop].indexOf(str)!= -1){
        results[key]=value;
      }
    });
    return results;
  };
});
