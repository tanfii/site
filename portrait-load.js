(function(){
  var typography=document.createElement('link');
  typography.rel='stylesheet';
  typography.href='typography-20260928.css';
  document.head.appendChild(typography);
})();

document.addEventListener('DOMContentLoaded',function(){
  var img=document.getElementById('portrait');
  if(img&&window.__portrait){
    img.src='data:image/avif;base64,'+window.__portrait;
    window.__portrait='';
  }
  document.querySelectorAll('.org-item').forEach(function(item){
    var title=item.querySelector('h3');
    var text=item.querySelector('p');
    if(title&&text&&title.textContent.trim()==='Оплата и чек'){
      text.textContent='Оплата после встречи. Принимаю оплату из России и из-за рубежа. После каждой оплаты формирую чек в «Мой налог». По запросу отправляю его в переписке.';
    }
  });
});
