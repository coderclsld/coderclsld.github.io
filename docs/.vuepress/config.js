const { config } = require("vuepress-theme-hope");
module.exports = config({
    dest:'public',
    darkmode:'auto-switch',
    // 站点配置
    lang: 'zh-CN',
    title: "clsld 's codebook",
    description: "clsld 's 的个人博客",
    search: true, //是否开启搜索
    // 主题和它的配置
    // theme: '@vuepress/theme-default',
    plugins: ['autobar'],
    markdown: {
        extendMarkdown: md => {
          md.use(require("markdown-it-disable-url-encode"));
        } 
    },
    themeConfig: {
      // type: "blog", // 类型要选blog
      // themePicker: false, // 页面主题颜色
      nav: [ // 头部按钮配置
        {
          text: "Home",
          link: "/",
          icon: "reco-home"
        },
        {
          text: "TimeLine",
          link: "/timeLine/",
          icon: "reco-date"
        }
      ],
    }
})
