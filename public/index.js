//jshint esversion:6

let socket = io();
socket.on('connect',function(){
count();
  //present
 let ob=window.location.pathname.split( '/' );
  socket.emit('join',ob,function(err){
    if(err){
      alert('Error');
      window.location.href="/";
    }else{

    }


  });
});

socket.on('disconnect',function(){


});

socket.on('updateUsersList',function(users){
  document.getElementById("onlinemem").innerHTML =users.length;
count();

});


//getting a new message and code
socket.on('newMessage',function(message){
  const time=moment(message.date).format('LT');

  const li=document.createElement('li');
  li.innerText = time+ ' ' + message.from +  ': ' + message.text;
  document.querySelector(".mainc").appendChild(li);


  updateScroll();
});


socket.on('newCode',function(code){
if(document.getElementById('input-id').value.trim() != code.text.trim()){
  document.getElementById('input-id').value = code.text;

}
count();
});

document.querySelector('#submit-btn').addEventListener('click',function(e){
e.preventDefault();

if(document.getElementById("input-id2").value.trim()==""){
  alert('Type something');
}else{
 var x = document.getElementById("myAnchor").getAttribute("title");


  socket.emit('createMessage',{
    from: x,
    text: document.getElementById("input-id2").value.trim(),
  });




}

//creating a new message


document.getElementById("input-id2").value="";

});


function updateScroll(){
    var element = document.getElementById("down");
    element.scrollTop = element.scrollHeight;
}


function updatecode(){
  socket.emit('createCode',{
    text: document.getElementById("input-id").value,
  });
  count();
}



function count(){

  $(".myTable").empty();

  var x = document.getElementById("input-id").value;
  var a=lineCount(x);

  for(var i=0;i<=a;i++){

    const li=document.createElement('li');
    li.innerText = i+1+"\n";
    document.querySelector(".myTable").appendChild(li);


  }
}
function lineCount( text ) {
    var nLines = 0;
    for( var i = 0, n = text.length;  i < n;  ++i ) {
        if( text[i] === '\n' ) {
            ++nLines;
        }
    }
    if(nLines!=null)
    return nLines+1;

}
