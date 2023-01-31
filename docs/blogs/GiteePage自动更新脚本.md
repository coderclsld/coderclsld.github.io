# Gitee Page自动更新脚本



最近喜欢上了用vupress搭建的博客，但是这个博客在没有这个脚本的时候，更新步骤大致分为一下几个：

1. 写完Markdown文章后对项目进行build（生成markdown映射成html的文件和目录）
2. 对项目进行git add、git commit -m、git push推送到Gitee上。
3. 打开Gitee 的Gitee page目录进行手动点击更新按钮进行更新

看到我上面的发布步骤了没，挺繁琐的，所以我打算做一下自动化脚本来完成它。

通过自动化脚本实现将更新步骤为：

1. 执行脚本完成以上所有步骤！！！

## 编写网页自动化脚本

那首先从最重要的事情开始，就是要写脚本模拟我的点击操作在网页上进行Gitee账户和密码登录，然后打开项目的GiteePage更新页面，点击更新按钮，确认浏览器弹出框，获取更新进度。

下面是我参考其他博主和修改节点后的代码，在2022年2月16日这个时间是可以正常执行的，无BUG:bug:!

代码使用JavaScript进行编写（例如创建文件名为`run.js`），代码需要Node.js环境，执行代码使用`node ./run.js`。

脚本中引入了一个最关键的包依赖puppeteer，没有下载过的可使用`npm install puppeteer --save `下载。

代码如下：

```java
const puppeteer = require('puppeteer');
const username = 'clsld'; // 账号
const password = 'password';//密码
const giteePageUrl = 'https://gitee.com/clsld/clsld/pages'; // GiteePage中更新page的网页地址
async function giteeUpdate(username, giteePageUrl, passwd) {
    const browser = await puppeteer.launch({
        // 此处可以使用 false 有头模式进行调试, 调试完注释即可
        headless: false,
    });
    const page = await browser.newPage();
    await page.goto('https://gitee.com/login');
    // 1. 选中账号控件
    let accountElements = await page.$x('//*[@id="user_login"]') // 此处使用 xpath 寻找控件，下同
    // 2. 填入账号
    await accountElements[0].type(username)
    // 3. 选中密码控件
    let pwdElements = await page.$x('//*[@id="user_password"]')
    // 4. 填入密码
    await pwdElements[0].type(passwd)
    // 5. 点击登录
    let loginButtons = await page.$x('//input[@type="submit"]');
    console.log(loginButtons[0].type);
    await loginButtons[0].click()
    // 6. 等待登录成功
    await page.waitFor(1000)
    await page.goto(giteePageUrl); // 比如： https://gitee.com/yang0033/hexo-blog/pages
    // 7. 点击更新按钮，并弹出确认弹窗
    let updateButtons = await page.$x('//*[@id="pages-branch"]/div[@class="button orange redeploy-button ui update_deploy"]')
    // 7.1. 监听步骤 7 中触发的确认弹框，并点击确认
    page.on('dialog', async dialog => {
        console.log(await dialog.message());
        await dialog.accept("确认");
    })
    await updateButtons[0].click()
    
    //   8. 轮询并确认是否更新完毕
    while (true) {
        await page.waitFor(2000)
        try {
            // 8.1 获取更新状态标签
            deploying = await page.$x('//*[@id="pages_deploying"]')
            if (deploying.length > 0) {
                console.log('更新中...')
            } else {
                console.log('更新完毕')
                break;
            }
        } catch (error) {
            break;
        }
    }
    await page.waitFor(500);
    // 10.更新完毕，关闭浏览器
    browser.close();
}

process.stdin.resume();
process.stdin.setEncoding('utf-8');
// process.stdout.write(`请输入${username}密码:`);
// process.stdin.on('data', function(data) {
//   var str = data.slice(0, -2);
//   process.stdin.emit('end');

giteeUpdate(username, giteePageUrl, password);
// });
process.stdin.on('end', function () {
    process.stdin.pause();
});
```

可以执行一下，看是否可以自动更新GiteePage，不想要弹出浏览器浏览步骤可以修改`headless`的值为true。

## 编写shell脚本

既然网页脚本都写了，那就把这个流程都写到底吧！

下面是**git提交项目**和**执行网页自动化程序**的shell脚本

`$1`是执行命令的第一个参数，以此类推。

创建push.sh文件，执行文件可以使用`sh push.sh 要提交的信息`执行脚本。

```shell
if [ ! $1 ]
then
  echo "####### 请输入提交信息 #######"
  exit;
fi
echo "开始执行命令"
echo "开始构建项目"
npm run build 
echo "####### 开始添加文件 #######"
git add .
git status 
sleep 1s
echo "####### 开始提交项目 #######"
git commit -m "$1"
sleep 1s
echo "####### 开始推送项目 #######"
git push -f
echo "####### 开始更新GiteePage #######"
node ./run.js
echo "脚本执行成功，项目发布完成！！！！"
exit;
```

## 执行效果

下面是执行脚本的效果，一步到胃！

```powershell
sh push.sh 更新run.js脚本和push.sh
开始执行命令
####### 开始添加文件 #######
error: the following file has changes staged in the index:
    run.js
(use --cached to keep the file, or -f to force removal)
On branch master
Your branch is up to date with 'origin/master'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   push.sh
        modified:   run.js

####### 开始提交项目 #######
[master fb39a3d] 更新run.js脚本和push.sh
 2 files changed, 2 insertions(+), 2 deletions(-)
####### 开始推送项目 #######
Enter passphrase for key '/c/Users/clsld/.ssh/id_rsa':
Enumerating objects: 7, done.
Counting objects: 100% (7/7), done.
Delta compression using up to 8 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (4/4), 396 bytes | 396.00 KiB/s, done.
Total 4 (delta 3), reused 0 (delta 0), pack-reused 0
remote: Powered by GITEE.COM [GNK-6.2]
To gitee.com:clsld/clsld.git
   b1c9489..fb39a3d  master -> master
####### 开始更新GiteePage #######
[AsyncFunction: type]
确定重新部署 Gitee Pages 吗?
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新中...
更新完毕
脚本执行成功，项目发布完成！！！！
```

