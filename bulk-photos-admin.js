(() => {
  const panel=document.querySelector('[data-panel="products"]');if(!panel)return;
  const box=document.createElement('section');box.className='admin-form';
  const title=document.createElement('h3');title.textContent='Автозагрузка фотографий';
  const status=document.createElement('p');status.setAttribute('role','status');
  const info=document.createElement('p');info.textContent='Бренд и модель должны совпасть. Уже добавленные фото сохраняются. Загрузка идёт автоматически, пока открыта админка.';
  box.append(title,info,status);panel.append(box);
  const key='777-bulk-photos-offset';
  let offset=Number(sessionStorage.getItem(key))||0;
  async function step(){
    try{
      const response=await fetch('/api/admin/bulk-photos',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({offset})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Ошибка автозагрузки');
      if(data.done){sessionStorage.removeItem(key);status.textContent='Проверка всех товаров завершена. Обновите таблицу, чтобы увидеть фото.';return;}
      offset=data.next;sessionStorage.setItem(key,String(offset));status.textContent='Проверено: '+offset+'. '+data.name+' — '+data.reason;
      setTimeout(step,data.status==='saved'?1500:700);
    }catch(error){status.textContent=error.message;status.className='form-status is-error';}
  }
  // Wait for the existing authenticated admin session, without a second installation action.
  fetch('/api/admin/session',{credentials:'same-origin'}).then(response=>{if(response.ok)step();});
})();
