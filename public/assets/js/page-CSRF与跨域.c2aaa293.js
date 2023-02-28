(window.webpackJsonp=window.webpackJsonp||[]).push([[10],{525:function(t,a,e){"use strict";e.r(a);var r=e(2),s=Object(r.a)({},(function(){var t=this,a=t.$createElement,e=t._self._c||a;return e("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[e("h2",{attrs:{id:"csrf与跨域"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#csrf与跨域"}},[t._v("#")]),t._v(" CSRF与跨域")]),t._v(" "),e("h3",{attrs:{id:"什么是跨域"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#什么是跨域"}},[t._v("#")]),t._v(" 什么是跨域")]),t._v(" "),e("h4",{attrs:{id:"定义"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#定义"}},[t._v("#")]),t._v(" 定义")]),t._v(" "),e("blockquote",[e("p",[t._v("同一协议、域名、端口即为同域，即当协议、端口、域名三者均相同时，浏览器会认为是同源，允许加载该资源，否则则认为不同源，进行同源限制策略，针对不同源，如果后端没有对响应字段进行处理，则响应回的数据会被浏览器直接过滤掉。这就是大多数开发时是为什么会出现浏览器跨域报错情况的原因。")])]),t._v(" "),e("h3",{attrs:{id:"跨域策略限制了哪些资源和操作"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#跨域策略限制了哪些资源和操作"}},[t._v("#")]),t._v(" 跨域策略限制了哪些资源和操作")]),t._v(" "),e("blockquote",[e("p",[t._v("不允许发送POST请求：在发送POST请求之前会发送OPTIONS请求，HTTP响应状态码为403（Forbidden）\n允许发送GET请求：HTTP响应状态码为200，但是不能读取服务器返回的数据。")])]),t._v(" "),e("h3",{attrs:{id:"什么是同源-什么是不同源"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#什么是同源-什么是不同源"}},[t._v("#")]),t._v(" 什么是同源，什么是不同源")]),t._v(" "),e("blockquote",[e("p",[t._v("举例来说，针对http://test.clsld.org/page.html这个地址，一下情况会被认为是同源或只不同源\nhttp://test.clsld.org/page2.html 同源 协议相同，主机名相同，端口名相同\nhttp://102.12.34.123/page.html 不同源 主机名不同，域名与域名对应的ip不同源\nhttp://test2.clsld.org/page/html 不同源 主域名相同，子域名不同\nhttps://test.clsld.org/page/html 不同源 协议不同")])]),t._v(" "),e("h3",{attrs:{id:"为什么会有浏览器限制"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#为什么会有浏览器限制"}},[t._v("#")]),t._v(" 为什么会有浏览器限制")]),t._v(" "),e("blockquote",[e("p",[t._v("浏览器同源策略的提出本来就是为了避免数据安全的问题，即：限制来自不同源的脚本，在浏览器中同时打开某电商网站（域名为b.com），同时在打开另一个网站(a.com)，那么在a.com域名下的脚本可以读取b.com下的Cookie，如果Cookie中包含隐私数据，后果不堪设想。因为可以随意读取任意域名下的Cookie数据，很容易发起CSRF攻击。")])]),t._v(" "),e("h3",{attrs:{id:"如何解决跨域"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#如何解决跨域"}},[t._v("#")]),t._v(" 如何解决跨域")]),t._v(" "),e("blockquote",[e("p",[t._v("1、nginx反向代理，我们都只到浏览器是判断域是否相同和请求头有无"),e("code",[t._v("Access-Control-Allow-Origin")]),t._v("、"),e("code",[t._v("Access-Control-Allow-Methods")]),t._v("、"),e("code",[t._v("Access-Control-Allow-Headers")]),t._v("来决定是否对该请求进行资源限制的，所以我们可以使用nginx反向代理，在服务器返回信息给nginx时在header头进行这些参数字段的设置，以此来解决跨域的问题。\n2、跨域资源共享（CORS）,服务端设置响应头的 access-control-allow-origin 的值为允许请求的域（客服端的）或设置为*（即匹配任意域名，任意客户端都可访问）；即可获取到该服务端响应的跨域资源。")])]),t._v(" "),e("h3",{attrs:{id:"什么是csrf"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#什么是csrf"}},[t._v("#")]),t._v(" 什么是CSRF")]),t._v(" "),e("blockquote",[e("p",[t._v("SRF跨站伪造请求，攻击者诱导受害者进入第三方网站，在第三方网站中，向被攻击网站发送跨站请求。利用受害者在被攻击网站已经获取的注册凭证，绕过后台的用户验证，达到冒充用户对被攻击的网站执行某项操作的目的。")])]),t._v(" "),e("blockquote",[e("p",[t._v("一个典型的CSRF攻击有着如下的流程：\n1、受害者登录a.com，并保留了登录凭证（Cookie）。\n攻击者引诱受害者访问了b.com。\nb.com 向 a.com 发送了一个请求：a.com/act=xx。浏览器会默认携带a.com的Cookie。\na.com接收到请求后，对请求进行验证，并确认是受害者的凭证，误以为是受害者自己发送的请求。\na.com以受害者的名义执行了act=xx。\n攻击完成，攻击者在受害者不知情的情况下，冒充受害者，让a.com执行了自己定义的操作。")])]),t._v(" "),e("h3",{attrs:{id:"怎么预防csrf"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#怎么预防csrf"}},[t._v("#")]),t._v(" 怎么预防CSRF")]),t._v(" "),e("p",[e("a",{attrs:{href:"https://tech.meituan.com/2018/10/11/fe-security-csrf.html",target:"_blank",rel:"noopener noreferrer"}},[t._v("引用美团的博客"),e("OutboundLink")],1)])])}),[],!1,null,null,null);a.default=s.exports}}]);