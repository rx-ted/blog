import{_ as i,o as a,c as e,a3 as t}from"./chunks/framework.Dwiz5riJ.js";const c=JSON.parse('{"title":"VitePress - 常用配置","description":"介绍Vitepress内置常用能力","frontmatter":{"author":"粥里有勺糖","original":false,"description":"介绍Vitepress内置常用能力","title":"VitePress - 常用配置","tag":["配置"]},"headers":[],"relativePath":"notes/posts/config/inline-matter.md","filePath":"notes/posts/config/inline-matter.md","lastUpdated":1726816794000}'),n={name:"notes/posts/config/inline-matter.md"};function l(p,s,h,r,d,k){return a(),e("div",{"data-pagefind-body":!0},s[0]||(s[0]=[t(`<h1 id="文章配置" tabindex="-1">文章配置 <a class="header-anchor" href="#文章配置" aria-label="Permalink to &quot;文章配置&quot;">​</a></h1><p>介绍常用的一些 官方默认主题 提供的能力:</p><ul><li><a href="https://vitepress.dev/guide/markdown" target="_blank" rel="noreferrer">https://vitepress.dev/guide/markdown</a></li><li><a href="https://vitepress.dev/reference/site-config" target="_blank" rel="noreferrer">https://vitepress.dev/reference/site-config</a></li></ul><h2 id="outline" tabindex="-1">outline <a class="header-anchor" href="#outline" aria-label="Permalink to &quot;outline&quot;">​</a></h2><ul><li>Type: <code>number | [number, number] | &#39;deep&#39; | false</code></li><li>Default: <code>2</code></li></ul><p>设置文章自动生成的目录，和 <a href="https://vitepress.dev/reference/default-theme-config#outline" target="_blank" rel="noreferrer">config.themeConfig.outline</a> 表现一样，文章里单独设置的优先级更高</p><div class="language-md vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">md</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">---</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 取二三级标题生成目录</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">outline</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: [</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">3</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">---</span></span></code></pre></div><p><img src="https://img.cdn.sugarat.top/mdImg/MTY3NzE2MzY5MzMyMA==677163693320" alt=""></p><h2 id="cleanurls" tabindex="-1">cleanUrls <a class="header-anchor" href="#cleanurls" aria-label="Permalink to &quot;cleanUrls&quot;">​</a></h2><div class="warning custom-block"><p class="custom-block-title">需要服务器支持</p><p>要使用 VitePress 提供干净的 URL，需要服务器端支持。</p><p>详见：<a href="https://vitepress.dev/guide/routing#generating-clean-url" target="_blank" rel="noreferrer">generating-clean-url</a></p></div><p>默认情况下，VitePress 解析以 <code>.html</code> 结尾的 URL 的入站链接。但是，某些用户可能更喜欢不带 <code>.html</code> 扩展名的“干净 URL” - 例如， <code>example.com/path</code> 而不是 <code>example.com/path.html</code> 。</p><p>可以先通过修改 VitePress 配置在购建时支持将路由处理成无 <code>.html</code> 后缀</p><div class="language-ts vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> { defineConfig } </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;vitepress&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">export</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> default</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> defineConfig</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">({</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  // 详见：https://vitepress.dev/reference/site-config#cleanurls</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  cleanUrls: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">})</span></span></code></pre></div><p>紧接着是修改服务端的配置，下面是常用的平台配置</p><div class="vp-code-group vp-adaptive-theme"><div class="tabs"><input type="radio" name="group-DtEYY" id="tab-t5qfYGb" checked><label for="tab-t5qfYGb">Nginx</label><input type="radio" name="group-DtEYY" id="tab-EhRbD2H"><label for="tab-EhRbD2H">Vercel</label></div><div class="blocks"><div class="language-sh vp-adaptive-theme active"><button title="Copy Code" class="copy"></button><span class="lang">sh</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">location</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> {</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   try_files</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> $uri $uri</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">/</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> $uri</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">.html</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> /404.html</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><div class="language-json vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">json</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">  &quot;cleanUrls&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">true</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><div class="danger custom-block"><p class="custom-block-title">如果不配置 VitePress cleanUrls 又想没有后缀的路由能够正常访问？</p><p>只需要配置服务端配置即可</p></div></div></div>`,15)]))}const g=i(n,[["render",l]]);export{c as __pageData,g as default};
