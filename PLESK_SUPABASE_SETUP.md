# Подключение Supabase на Plesk

После развёртывания коммита создайте **вне папки `httpdocs`** файл:

`/var/www/vhosts/777qurylys.kz/.777qurylys.env`

Если файловый менеджер не позволяет подняться на уровень выше, создайте
`httpdocs/.777qurylys.env`: `.htaccess` из проекта запрещает отдавать этот файл
по HTTP.

Содержимое файла (подставьте свои значения):

```ini
SUPABASE_URL=https://ogjwvnvqkekqqwwilpfk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-secret-key
ADMIN_USER=your-admin-login
ADMIN_PASSWORD=your-long-admin-password
ADMIN_SESSION_SECRET=random-string-at-least-32-characters
```

После сохранения откройте `https://777qurylys.kz/api/catalog`. При корректной
конфигурации браузер покажет JSON с товарами и категориями.

Никогда не добавляйте этот файл в Git. После первоначальной настройки замените
пароль базы и ключи Supabase, которые были отправлены в чат.
