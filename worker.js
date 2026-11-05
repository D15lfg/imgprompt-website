/* 只做一件事：给首屏视频补上 Range 支持。
   Workers 静态资源默认不支持 Range，收到 Range 头也返回 200 + 整个文件，
   Safari 播视频需要 206。其余请求一律直接交给静态资源，不进 Worker。 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/assets/hero-demo.mp4") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    // 不带 Range 头去取完整文件，避免静态资源把 Range 吞掉。
    // 静态资源的响应不带 Content-Length，所以长度只能从读到的字节数取。
    const full = await env.ASSETS.fetch(new URL(url.toString()));
    if (!full.ok && full.status !== 304) return full;

    const buf = await full.arrayBuffer();
    const total = buf.byteLength;
    const base = new Headers(full.headers);
    base.set("Accept-Ranges", "bytes");
    base.set("Content-Length", String(total));

    const range = request.headers.get("Range");
    if (!range) {
      return new Response(request.method === "HEAD" ? null : buf, {
        status: full.status,
        headers: base,
      });
    }

    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === "" && m[2] === "")) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}`, "Accept-Ranges": "bytes" },
      });
    }

    let start;
    let end;
    if (m[1] === "") {
      // bytes=-N：最后 N 个字节
      const n = Number(m[2]);
      if (n <= 0) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${total}`, "Accept-Ranges": "bytes" },
        });
      }
      start = Math.max(0, total - n);
      end = total - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
    }

    if (start > end || start >= total) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}`, "Accept-Ranges": "bytes" },
      });
    }

    const buf2 = buf.slice(start, end + 1);
    base.set("Content-Range", `bytes ${start}-${end}/${total}`);
    base.set("Content-Length", String(end - start + 1));

    return new Response(request.method === "HEAD" ? null : buf2, {
      status: 206,
      headers: base,
    });
  },
};
