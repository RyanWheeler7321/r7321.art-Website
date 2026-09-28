import { handleSupport } from "./support.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/support.php") return handleSupport(request, env);
    return env.ASSETS.fetch(request);
  },
};
