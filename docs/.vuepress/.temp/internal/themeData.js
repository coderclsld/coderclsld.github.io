export const themeData = {
  "logo": "https://vuejs.org/images/logo.png",
  "nav": [
    {
      "text": "指南",
      "link": "/guide/"
    },
    {
      "text": "手册",
      "link": "/handbook/"
    },
    {
      "text": "工具",
      "items": [
        {
          "text": "代码生成器",
          "link": "/"
        }
      ]
    }
  ],
  "sidebar": {
    "/handbook/": [
      {
        "title": "1. 框架指南",
        "collapsable": true,
        "path": "framework"
      },
      {
        "title": "2. 功能特性",
        "collapsable": true,
        "children": [
          {
            "title": "内置功能",
            "path": "/handbook/"
          },
          {
            "title": "展望未来",
            "path": "/handbook/"
          }
        ]
      }
    ]
  },
  "sidebarDepth": 3,
  "locales": {
    "/": {
      "selectLanguageName": "English"
    }
  },
  "navbar": [],
  "darkMode": true,
  "repo": null,
  "selectLanguageText": "Languages",
  "selectLanguageAriaLabel": "Select language",
  "editLink": true,
  "editLinkText": "Edit this page",
  "lastUpdated": true,
  "lastUpdatedText": "Last Updated",
  "contributors": true,
  "contributorsText": "Contributors",
  "notFound": [
    "There's nothing here.",
    "How did we get here?",
    "That's a Four-Oh-Four.",
    "Looks like we've got some broken links."
  ],
  "backToHome": "Take me home",
  "openInNewWindow": "open in new window",
  "toggleDarkMode": "toggle dark mode",
  "toggleSidebar": "toggle sidebar"
}

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateThemeData) {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ themeData }) => {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  })
}
