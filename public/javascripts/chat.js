
$(function() {
	var uname= false;
	var pass= false;
	var email= false;

	$('#send').click(function () {
		var data = {
			message: $('#message').val(),
			type: 'userMessage'
		};
		socket.send(JSON.stringify(data));
		$('#message').val('');
	});

	$('.logreg .showlog').click(function() {
		$('#log').show();
		$('#reg').hide();
	});

	$('.logreg .showreg').click(function() {
		$('#log').hide();
		$('#reg').show();
	});

	$('.logreg input').blur(function() {
		var field= $(this);
		if(field.val().length===0){
			field.css('backgroundColor', 'lightpink');
			if($('#error'+this.id).length===0){
				field.after('<div id="error'+this.id+'">this field is required</div>');
				field.attr('filled', 'false');
			}
			else{
				$('#error'+this.id).show();
			}
		}
		else{
			field.attr('filled', 'true');
		}
	}).keydown(function() {
		var field= $(this);
		field.css('backgroundColor', 'white');
		$('#error'+this.id).hide();
	});

	$('.logreg button').click(function(){
		var username= $('#user');
		var password= $('#pass');
		var confirmpassword= $('#confirm');
		var route= (this.id).replace('#', '/');
		var uname = username.val();
		var pass = password.val();
		var confirm= confirmpassword.val();
		console.log(uname);
		if(username.attr('filled') && password.attr('filled') && confirmpassword.attr('filled') && confirm===pass) {
			$.post( route, {
				email: uname,
				password: pass
			}, function (data) {
				if(typeof data === "object"){
					var boxtitle= $('#boxtitle');
					if($('#error').length===0){
						boxtitle.before('<div id="error">'+data.message+'</div>');
					}
					else{
						$('#error').html(data.message);
					}
				}
				else if(typeof data === 'string'){
					$('.logreg').remove();
					$('#banner').after(data);
				}
				console.log(typeof data);
				console.log(data);
			});
		}
	});

});