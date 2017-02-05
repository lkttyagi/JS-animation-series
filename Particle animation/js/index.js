var percentage = 0;
var total = 0;

 setInterval(function(){ 
   if(total < 100){
     progress(); 
   }else{
     $('.val').text("");
   }   
  }, 100);

function progress(){
  total = total + 5;
 percentage = percentage + 5;
  $('.val').text(percentage +"% ");
  $('.loader').css({
    'width': percentage+"%",
    'background': 'rgb('+percentage+','+percentage+','+percentage+')'
  });
}

$(document).ready(function () {
  setTimeout(function () {
      $('.col-md-4').hide();
  }, 2000);
});