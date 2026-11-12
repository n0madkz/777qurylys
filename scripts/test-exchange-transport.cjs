const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:18777/?type=catalog&';
let cookie = '';
async function step(query, options = {}) {
  const response = await fetch(base + query, { ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
  return { status: response.status, text: await response.text() };
}
(async () => {
  assert.equal((await step('mode=init')).status, 401);
  const auth = await step('mode=checkauth', { headers: { Authorization: 'Basic ' + Buffer.from('test_exchange:local-test-password-1234567890').toString('base64') } });
  assert.equal(auth.status, 200);
  const lines = auth.text.trim().split('\n');
  assert.equal(lines[0], 'success'); cookie = lines[1] + '=' + lines[2];
  assert.match((await step('mode=init')).text, /zip=no\nfile_limit=524288/);
  assert.equal((await step('mode=file&filename=../bad', {method:'POST',body:'bad'})).status, 400);
  for (const name of ['import.xml','offers.xml']) {
    for (const chunk of ['<КоммерческаяИнформация>', '</КоммерческаяИнформация>']) {
      assert.equal((await step('mode=file&filename='+name, {method:'POST', body:chunk})).text.trim(), 'success');
    }
    const imported = await step('mode=import&filename='+name);
    assert.match(imported.text, name === 'import.xml' ? /^success/ : /^progress/);
  }
  assert.match((await step('mode=import&filename=offers.xml')).text, /^success/);
  assert.match((await step('mode=import&filename=offers.xml')).text, /^success/);
  assert.equal((await step('mode=deactivate')).text.trim(), 'success');
  console.log('PASS: authentication, cookies, init, chunked files, path rejection, progress, completion and retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
