const puppeteer = require('puppeteer');
const username = 'clsld'; // 账号
const password = 'zxc110120119';//密码
const giteePageUrl = 'https://gitee.com/clsld/clsld/pages'; // gitee page的更新入口地址
async function giteeUpdate(username, giteePageUrl, passwd) {
    const browser = await puppeteer.launch({
        // 此处可以使用 false 有头模式进行调试, 调试完注释即可
        headless: true,
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
    // console.log(loginButtons[0].type);
    await loginButtons[0].click()
    // 6. 等待登录成功
    await page.waitForTimeout(1000)
    await page.goto(giteePageUrl); // 比如： https://gitee.com/yang0033/hexo-blog/pages
    // 7. 点击更新按钮，并弹出确认弹窗
    let updateButtons = await page.$x('//*[@id="pages-branch"]/div[@class="button orange redeploy-button ui update_deploy"]')
    // 7.1. 监听步骤 7 中触发的确认弹框，并点击确认
    page.on('dialog', async dialog => {
        // console.log(await dialog.message());
        await dialog.accept("确认");
    })
    await page.waitForTimeout(1000)
    await updateButtons[0].click()
    
    //   8. 轮询并确认是否更新完毕
    while (true) {
        await page.waitForTimeout(2000)
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
    await page.waitForTimeout(500);
    // 10.更新完毕，关闭浏览器
    browser.close();
}

// process.stdin.resume();
// process.stdin.setEncoding('utf-8');
// process.stdout.write(`请输入${username}密码:`);
// process.stdin.on('data', function(data) {
//   var str = data.slice(0, -2);
//   process.stdin.emit('end');
giteeUpdate(username, giteePageUrl, password);
// });