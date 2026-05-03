// v1.3 - Chỉ Proxy, không check KV ở đây
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Bẻ lái ngầm sang con Worker API
    if (url.pathname.startsWith("/v1") || url.pathname.startsWith("/v2") || url.pathname.startsWith("/api")) {
      const workerUrl = new URL(request.url);
      workerUrl.hostname = "vpn-api.doicucden.workers.dev";
      
      const newRequest = new Request(workerUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: (request.method === 'GET' || request.method === 'HEAD') ? null : request.body,
        redirect: "manual"
      });
      
      return fetch(newRequest);
    }

    // Phục vụ giao diện tĩnh (index.html, admin.html,...)
    return env.ASSETS.fetch(request);
  }
};
