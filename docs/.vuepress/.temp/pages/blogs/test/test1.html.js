export const data = {
  "key": "v-306c35a0",
  "path": "/blogs/test/test1.html",
  "title": "",
  "lang": "zh-CN",
  "frontmatter": {},
  "excerpt": "",
  "headers": [
    {
      "level": 2,
      "title": "我的第一篇vuepress",
      "slug": "我的第一篇vuepress",
      "children": [
        {
          "level": 3,
          "title": "测试",
          "slug": "测试",
          "children": []
        }
      ]
    }
  ],
  "git": {},
  "filePathRelative": "blogs/test/test1.md"
}

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updatePageData) {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ data }) => {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  })
}
