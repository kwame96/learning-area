'use strict';

const api = {
  async req(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },
  get: (u) => api.req('GET', u),
  post: (u, b) => api.req('POST', u, b),
  put: (u, b) => api.req('PUT', u, b),
  patch: (u, b) => api.req('PATCH', u, b),
  del: (u) => api.req('DELETE', u),

  async upload(url, formData) {
    const res = await fetch(url, { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    return data;
  },
};

function setStatus(el, msg, ok) {
  el.textContent = msg;
  el.className = 'status ' + (ok ? 'ok' : 'err');
}
