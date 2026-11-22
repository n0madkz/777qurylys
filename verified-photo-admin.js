(() => {
  const panel=document.querySelector('[data-panel="products"]');if(!panel)return;
  const box=document.createElement('section');box.className='admin-form';
  const title=document.createElement('h3');title.textContent='Фото из интернета: первый товар';
  const text=document.createElement('p');text.textContent='IVT RHM-1000/2F BMC · код 1С НФ-00000560. Точная модель проверена на ivt.kz.';
  const image=document.createElement('img');image.src='assets/product-photos/ivt-rhm-1000-2f-bmc.png';image.alt='Проверенное фото IVT';image.style.cssText='width:160px;height:190px;object-fit:contain';image.loading='lazy';
  const source=document.createElement('a');source.href='https://ivt.kz/catalog/powertools/perforator/item/5459';source.target='_blank';source.rel='noopener';source.textContent='Источник: IVT';
  const button=document.createElement('button');button.type='button';button.className='button button--primary';button.textContent='Установить фото IVT';
  const status=document.createElement('p');status.setAttribute('role','status');
  button.onclick=async()=>{button.disabled=true;try{
    const response=await fetch('/api/admin/verified-photo',{method:'POST',credentials:'same-origin'});const data=await response.json();if(!response.ok)throw Error(data.error||'Ошибка сохранения');status.textContent=data.message;
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
  box.append(title,text,image,source,button,status);panel.append(box);
})();
