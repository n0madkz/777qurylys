(() => {
  const panel=document.querySelector('[data-panel="requests"]');
  if(!panel)return;
  const box=document.createElement('div');box.className='admin-form';
  const title=document.createElement('h3');title.textContent='Уведомления в Telegram';
  const status=document.createElement('p');status.setAttribute('role','status');status.style.whiteSpace='pre-wrap';
  const buttons=[];
  for(const [action,label] of [['check','Проверить Telegram'],['retry','Отправить ожидающие заявки']]) {
    const button=document.createElement('button');button.type='button';button.className='button button--outline';button.textContent=label;buttons.push(button);box.append(button);
    button.onclick=async()=>{
      buttons.forEach(b=>b.disabled=true);status.textContent='Проверяем подключение…';
      try {
        const response=await fetch('/api/admin/telegram',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
        const data=await response.json();if(!response.ok)throw Error(data.error||'Ошибка проверки');
        status.textContent=data.message;status.className='form-status is-success';
      }catch(error){status.textContent=error.message;status.className='form-status is-error';}
      finally{buttons.forEach(b=>b.disabled=false);}
    };
  }
  box.prepend(title);box.append(status);panel.append(box);
})();
