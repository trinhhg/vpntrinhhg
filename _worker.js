// v1.1 - Add robust error logging & KV binding check - 2026-05-03
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. CẤU HÌNH CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Kiểm tra cực mạnh: Nếu bạn chưa khai báo KV VPN_DB, sẽ báo rõ chữ này
    if (!env.VPN_DB) {
      return new Response(JSON.stringify({ error: "LỖI HỆ THỐNG: CHƯA BINDING KV 'VPN_DB' TRONG CLOUDFLARE DASHBOARD!" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. XỬ LÝ DATABASE CHO ADMIN PANEL (KV Storage)
    if (path.startsWith("/api/")) {
      const dbKey = path.replace("/api/", "").toUpperCase() + "_DB";
      
      // Lấy dữ liệu
      if (request.method === "GET") {
        try {
          const data = await env.VPN_DB.get(dbKey);
          const fallback = dbKey === "CMS_DB" ? "{}" : "[]";
          return new Response(data || fallback, {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Lỗi đọc Database", details: error.message }), { status: 500, headers: corsHeaders });
        }
      }
      
      // Lưu dữ liệu
      if (request.method === "POST") {
        try {
          const body = await request.text();
          // Không check body rỗng để cho phép clear DB nếu cần
          await env.VPN_DB.put(dbKey, body);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Lỗi ghi Database", details: error.message }), { status: 500, headers: corsHeaders });
        }
      }
    }

    // 3. XỬ LÝ BẺ LÁI LINK SUB ẨN (THUẦN TÚY)
    if (path.startsWith("/v1/") || path.startsWith("/v2/")) {
      const searchParams = url.search; // Lấy đoạn ?OwO=...
      let targetUrl = "";

      // Tìm trong Database xem link này gốc là gì
      try {
        const linksStr = await env.VPN_DB.get("LINKS_DB");
        if (linksStr) {
          const linksDb = JSON.parse(linksStr);
          const found = linksDb.find(l => l.orig && l.orig.includes(searchParams));
          if (found) targetUrl = found.orig;
        }
      } catch(e) {
        console.error("Lỗi đọc DB Link ẩn");
      }

      // Dự phòng (Fallback): Nếu mất DB thì tự động nối link theo tên miền mặc định
      if (!targetUrl) {
        if (path.startsWith("/v1/")) {
          targetUrl = "https://liangxin.xyz/api/v1/liangxin" + searchParams;
        } else if (path.startsWith("/v2/")) {
          targetUrl = "https://djjc.cfd/api/v1/client/subscribe" + searchParams; 
        }
      }

      if (targetUrl) {
        // Chuyển hướng 302 thuần túy, trả đúng về link gốc kèm đuôi tên Profile
        return Response.redirect(targetUrl + "#VPNTrinhHg", 302);
      } else {
        return new Response("Link Sub không tồn tại!", { status: 404 });
      }
    }

    // Phản hồi mặc định nếu truy cập thẳng vào domain worker
    return new Response("VPN API Backend is running smoothly!", { 
      status: 200, 
      headers: corsHeaders 
    });
  }
};
