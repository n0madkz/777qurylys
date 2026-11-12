(() => {
 const button=document.getElementById('autoCategorize');
 const status=document.getElementById('autoCategoryStatus');
 button.addEventListener('click',async()=>{
  if(!confirm('Создать разделы и распределить товары без категории или с группами 1С? Вручную назначенные категории, фото и остальные данные сохранятся. Неоднозначные товары попадут в общие разделы для проверки.'))return;
  button.disabled=true;status.className='form-status is-success';
  let offset=0,updated=0,review=0;
  try{
   for(;;){
    status.textContent=`Проверено ${offset}, распределено ${updated}. Не закрывайте страницу.`;
    const response=await fetch('/api/admin/categorize',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({offset})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Ошибка распределения');
    offset=data.next;updated+=data.updated;review+=data.review;if(data.done)break;
   }
   alert(`Распределено: ${updated}. Требуют проверки: ${review}. Вручную выбранные категории сохранены.`);location.reload();
  }catch(error){status.className='form-status is-error';status.textContent=error.message+' Можно повторить: уже назначенные категории сохранятся.';}
  finally{button.disabled=false;}
 });
})();
