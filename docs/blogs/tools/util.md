## superUilts

### Go

#### go时间生成

```go
package crawl

import (
	"fmt"
	"testing"
	"time"
)

func TestTime(t *testing.T) {
	currentTime := time.Now()
	fmt.Println("获取当前时间 time.Time:", currentTime)
   //获取当前时间 time.Time: 2023-02-03 10:50:01.3810935 +0800 CST m=+0.002673101
	
	timeStemp := time.Now().Unix()
	fmt.Println("获取当前时间戳:", timeStemp)
	//获取当前时间戳: 1675392601
    
	timeStr := time.Now().Format("2006-01-02 15:04:05")
	fmt.Println("获取当前时间的字符串格式:", timeStr)
	//获取当前时间的字符串格式: 2023-02-03 10:50:01
    
	formatTimeStr := time.Unix(123455552, 0).Format("2006-01-02 15:04:05")
	fmt.Println("时间戳转字符串:", formatTimeStr)
	//时间戳转字符串: 1973-11-30 05:12:32
    
	formatTimeStr = "2017-04-11 13:33:37"
	//默认的parse是使用+0时区
	formatTimeParse, _ := time.Parse("2006-01-02 15:04:05", formatTimeStr)
	fmt.Println("字符串转时间 time.Time:", formatTimeParse)
   //字符串转时间 time.Time: 2017-04-11 13:33:37 +0000 UTC
    
	//使用当前时区格式化时间
	formatTimeParseInLocation, _ := time.ParseInLocation("2006-01-02 15:04:05", formatTimeStr, time.Local)
	fmt.Println("使用当前时区格式化时间:", formatTimeParseInLocation)
	//使用当前时区格式化时间: 2017-04-11 13:33:37 +0800 CST
    
	//在上面基础上转时间戳
	timeStemp = formatTimeParse.Unix()
	fmt.Println("默认时区字符串转时间戳:", timeStemp)
	//默认时区字符串转时间戳: 1491917617
    
	timeStemp = formatTimeParseInLocation.Unix()
	fmt.Println("本地时区字符串转时间戳:", timeStemp)
   //本地时区字符串转时间戳: 1491888817
}

```

#### go服务启动命令

```shell
/home/app/ll_game_strategy_base/ll_game_strategy_base -logtostderr=true -v=800 /home/app/ll_game_strategy_base/config.ini
```

#### go字符串和数字相互转换

```go
import(
	"strconv"
)
//string转int
int,err := strconv.Atoi(string)
//string转int 64
int64,err := strconv.ParseInt(string,10,64)
//int转string
string := strconv.Itoa(int)
//int64转string
string := strconv.FormatInt(int64,10)
```



### php

#### php时间生成

```php
date("Y-m-d H:i:s"); //获取当前日期格式的字符串 2017-12-14 23:13:51

time(); //获取当前时间戳

date("Y-m-d H:i:s",strtotime("-1 week"));//一周前

date("Y-m-d H:i:s"，1513264258); //获取某个时间戳对应的日期格式的字符串

strtotime('2017-12-14 23:13:51'); //获取某个日期的时间戳
```



### mysql

#### mysql链接命令

```shell
mysql -h 127.0.0.1 -u root -p -P 3306
```







### Redis命令

```shell
$redis->hIncrBy() hash自增自减函数
```



### Git

#### git push失败

```shell
#取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```



### vim

```shell
#当用vim打开文件的时候没有sudo保存报只读无法修改错误，可以使用以下命令切换sudo保存
:w !sudo tee %
```

