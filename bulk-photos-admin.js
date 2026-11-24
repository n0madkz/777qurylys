(() => {
  const panel=document.querySelector('[data-panel="products"]');if(!panel)return;
  const box=document.createElement('section');box.className='admin-form';
  const title=document.createElement('h3');title.textContent='Бренды и автозагрузка фотографий';
  const status=document.createElement('p');status.setAttribute('role','status');
  const info=document.createElement('p');info.textContent='Фото подбираются по бренду и модели. Без бренда или артикула — по полному названию, размерам, цвету и фасовке. При недостаточном совпадении товар пропускается. Ваши фото сохраняются. Оставьте админку открытой.';
  box.append(title,info,status);panel.append(box);
  const key='777-bulk-photos-offset-v4';
  let offset=Number(sessionStorage.getItem(key))||0, failures=0;
  let brandOffset=0, brandUpdated=0, brandUnknown=0, brandSummary='', photosSaved=0, photosSkipped=0;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function request(route,body){
    while(true){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
      try{
        const response=await fetch('/api/admin/'+route,{method:'POST',credentials:'same-origin',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await response.json().catch(()=>null);
        if(!response.ok){
          if([429,500,502,504].includes(response.status))throw new TypeError(data?.error||'Сервер временно недоступен');
          throw Error(data?.error||(response.status===401?'Войдите в админку заново.':'Ошибка обработки'));
        }
        if(!data)throw new TypeError('Сервер вернул неполный ответ');
        failures=0;status.className='';return data;
      }catch(error){
        if(!(error instanceof TypeError)&&error.name!=='AbortError')throw error;
        failures++;const delay=Math.min(60000,5000*2**Math.min(failures-1,4));
        status.textContent='Соединение прервалось. Продолжим с той же позиции через '+delay/1000+' сек. Обработку начинать заново не нужно.';
        status.className='form-status is-error';await pause(delay);
      }finally{clearTimeout(timer);}
    }
  }
  async function run(){
    try{
      while(true){
        status.textContent='Этап 1 из 2 — бренды. Проверено товаров: '+brandOffset+'. Заполнено полей бренда: '+brandUpdated+'. Фотографии пока не загружаются.';
        const data=await request('fill-brands',{offset:brandOffset});
        brandOffset=data.next;brandUpdated+=data.updated;brandUnknown+=data.unknown;
        if(data.done)break;
        await pause(300);
      }
      brandSummary='Бренды: проверено товаров '+brandOffset+', заполнено полей бренда '+brandUpdated+', не распознано '+brandUnknown+'. ';
      document.dispatchEvent(new CustomEvent('product-brands-updated'));
      while(true){
        const data=await request('bulk-photos',{offset});
        if(data.done){sessionStorage.removeItem(key);status.textContent=brandSummary+'Фотографии: загружено за этот запуск '+photosSaved+', пропущено '+photosSkipped+'. Проверка завершена. Обновите таблицу товаров.';return;}
        offset=data.next;sessionStorage.setItem(key,String(offset));
        if(data.status==='saved')photosSaved++;else photosSkipped++;
        status.textContent='Этап 2 из 2 — фотографии. Проверено товаров: '+offset+'. Загружено фото за этот запуск: '+photosSaved+'. Пропущено: '+photosSkipped+'. '+data.name+' — '+data.reason;
        await pause(data.status==='saved'?1500:700);
      }
    }catch(error){status.textContent=brandSummary+error.message;status.className='form-status is-error';}
  }
  fetch('/api/admin/session',{credentials:'same-origin'}).then(response=>{if(response.ok)run();}).catch(()=>{status.textContent='Не удалось проверить вход. Обновите страницу после восстановления соединения.';});
})();
