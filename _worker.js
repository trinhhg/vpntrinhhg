export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Bẻ lái ngầm sang con Worker chứa Database (Link Sub & API)
    if (url.pathname.startsWith("/v1") || url.pathname.startsWith("/v2") || url.pathname.startsWith("/api")) {
      const workerUrl = new URL(request.url);
      workerUrl.hostname = "vpn-api.doicucden.workers.dev";
      const newRequest = new Request(workerUrl.toString(), request);
      return fetch(newRequest);
    }

    // Phục vụ giao diện tĩnh
    return env.ASSETS.fetch(request);
  }
};
