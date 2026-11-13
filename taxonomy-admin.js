(() => {
 const button=document.getElementById('autoCategorize');
 const status=document.getElementById('autoCategoryStatus');
 document.getElementById('mergeCategories').addEventListener('click',async event=>{
  if(!confirm('Объединить старые повторяющиеся категории с актуальными? Товары и вложенные разделы будут перенесены. Старые категории сохранятся скрытыми.'))return;
  const merge=event.currentTarget;merge.disabled=true;button.disabled=true;status.className='form-status is-success';let offset=0;
  try{
   for(;;){
    const response=await fetch('/api/admin/merge-categories',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({offset})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Ошибка объединения');
    offset=data.next;status.textContent=`Объединено ${offset} из ${data.total} повторяющихся разделов.`;if(data.done)break;
   }
   location.reload();
  }catch(error){status.className='form-status is-error';status.textContent=error.message+' Объединение можно повторить.';}
  finally{merge.disabled=false;button.disabled=false;}
 });
 button.addEventListener('click',async()=>{
  if(!confirm('Создать разделы и исправить автоматические категории всех товаров? Вручную назначенные категории, фото, тексты и остатки сохранятся.'))return;
  button.disabled=true;status.className='form-status is-success';
  let offset=0,updated=0,review=0;
  try{
   for(;;){
    status.textContent=`Проверено ${offset}, распределено ${updated}. Не закрывайте страницу.`;
    const response=await fetch('/api/admin/categorize',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({offset})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Ошибка распределения');
    offset=data.next;updated+=data.updated;review+=data.review;if(data.done)break;
   }
   alert(`Проверено товаров: ${offset}. Категории назначены или исправлены: ${updated}. Требуют проверки: ${review}. Вручную выбранные категории сохранены.`);location.reload();
  }catch(error){status.className='form-status is-error';status.textContent=error.message+' Можно повторить: уже назначенные категории сохранятся.';}
  finally{button.disabled=false;}
 });
})();
