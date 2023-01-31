## superUilts

### goland时间戳生成

```go
package main

import (
	"fmt"
	"time"
)
func main() {
	var cstSh, _ = time.LoadLocation("Asia/Shanghai") //上海
	startTime := time.Now().In(cstSh).AddDate(0, 0, -1)
	//startTime = time.Date(startTime.Year(), startTime.Month(), startTime.Day(), 0, 0, 0, 0, startTime.Location())
	fmt.Println(startTime)
	fmt.Println(startTime.Unix())
    
    currentTime := time.Now()

     fmt.Println("当前时间  : ", currentTime)

     fmt.Println("当前时间字符串: ", currentTime.String())

     fmt.Println("MM-DD-YYYY : ", currentTime.Format("01-02-2006"))

     fmt.Println("YYYY-MM-DD : ", currentTime.Format("2006-01-02"))

     fmt.Println("YYYY.MM.DD : ", currentTime.Format("2006.01.02 15:04:05"))

     fmt.Println("YYYY#MM#DD {Special Character} : ", currentTime.Format("2006#01#02"))

     fmt.Println("YYYY-MM-DD hh:mm:ss : ", currentTime.Format("2006-01-02 15:04:05"))

     fmt.Println("Time with MicroSeconds: ", currentTime.Format("2006-01-02 15:04:05.000000"))

     fmt.Println("Time with NanoSeconds: ", currentTime.Format("2006-01-02 15:04:05.000000000"))

     fmt.Println("ShortNum Month : ", currentTime.Format("2006-1-02"))

     fmt.Println("LongMonth : ", currentTime.Format("2006-January-02"))

     fmt.Println("ShortMonth : ", currentTime.Format("2006-Jan-02"))

     fmt.Println("ShortYear : ", currentTime.Format("06-Jan-02"))

     fmt.Println("LongWeekDay : ", currentTime.Format("2006-01-02 15:04:05 Monday"))

     fmt.Println("ShortWeek Day : ", currentTime.Format("2006-01-02 Mon"))

     fmt.Println("ShortDay : ", currentTime.Format("Mon 2006-01-2"))
}
```





### 请求截图参数

以下参数get、post均可，当get请求是url参数需要进行endecode，防止url参数链接干扰正常的请求访问参数

| 参数         | 解释                                 | 是否必须               |
| ------------ | ------------------------------------ | ---------------------- |
| orderid      | 业务传递过来的id                     | yes                    |
| business     | 业务类型                             | yes                    |
| redrictURL   | 回调地址                             | yes                    |
| url          | 截图URL网页                          | yes                    |
| type         | 截图类型：1为长截图，2为窗口大小截图 | no，默认为窗口大小截图 |
| scrollHeight | 长截图高度限制，减少截图时间         | no，默认为最大截图高度 |

MD5() -> set集合

存在 返回该任务已存在

不存在 存表并加入list队列



### 请求截图返回参数

| 参数   | 解释                                                         |      |
| ------ | ------------------------------------------------------------ | ---- |
| code   | 200表示调用成功、500表示服务器异常、201表示客户端参数错误    |      |
| msg    | 表示相应状态的信息，200：调用成功，已加入截图任务队列；500：服务器异常；201：参数错误和详细说明 |      |
| taskid | 任务id                                                       |      |
| MD5    | 请求参数的各项MD5加密，需与taskid对应才会返回图片            |      |



### 回调请求参数

| 参数   | 解释              |      |
| ------ | ----------------- | ---- |
| taskid | 任务id            |      |
| MD5    | 上一步返回的MD5值 |      |
|        |                   |      |

### 回调返回参数

| 参数     | 解释                                                      |      |
| -------- | --------------------------------------------------------- | ---- |
| code     | 200表示任务成功，500表示服务器异常，201表示服务器任务失败 |      |
| msg      | 对应状态的信息                                            |      |
| imageURL | 任务成功的图片地址                                        |      |



### 任务表

| 字段         | 解释                                                         |      |
| ------------ | ------------------------------------------------------------ | ---- |
| taskid       | 自增id                                                       |      |
| orderid      | 业务方提供的id                                               |      |
| business     | 业务类型                                                     |      |
| redrictURL   | 回调地址                                                     |      |
| url          | 访问地址                                                     |      |
| scrollHeight | 长截图高度限制                                               |      |
| status       | 状态: 0=>添加任务失败; 1=>添加任务成功; 2=>执行任务中; 3=>任务执行失败; 4=>任务执行成功 |      |
| iconUrl      | 保存图片地址                                                 |      |
| md5          | 参数的MD5加密                                                |      |



## mysql链接命令

```shell
mysql -h 127.0.0.1 -u root -p -P 3306
```



/home/app/ll_game_strategy_base/ll_game_strategy_base -logtostderr=true -v=800 /home/app/ll_game_strategy_base/config.ini

