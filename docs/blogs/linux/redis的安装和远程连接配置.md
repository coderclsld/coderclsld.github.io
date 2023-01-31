# redis的安装和远程连接配置

## 1、redis的安装

### 下载安装包

```javascript
wget http://download.redis.io/releases/redis-4.0.6.tar.gz
```

### 解压

```javascript
tar -zxvf redis-4.0.6.tar.gz
```

### yum安装gcc依赖

```javascript
yum install gcc
```

### 跳转到redis解压目录下编译安装

```javascript
make && make install
```

## 2、启动redis

切换到安装后的redis目录下，里面有redis.conf文件（redis的配置文件），src目录中有很多redis命令

```java
//进入src目录运行redis提供的命令启动redis和开启客户端
cd src
//启动redis服务器
./redis-server
//启动redis客户端，就是连接redis服务器来看和操作redis内存的数据的非图形化client
./redis-cli
```

## 3、远程连接配置

远程连接配置要先配置一下redis密码和一些命令

跳出src目录，可以看到redis.conf文件，下面在这个文件里面进行配置

> 按ESC键，在底下窗口的打上，/加上想要搜索的关键词，vim就会找到文件的相同关键字,按enter键可以跳到下一个关键字。
>
> ![image-20210209233639879](https://blog-1300924781.cos.ap-guangzhou.myqcloud.com/blog/image-20210209233639879.png)

```javascript
//vim打开redis.conf,修改redis.conf文件
vim redis.conf


//以守护进程模式运行（即可以自己后台运行），找到daemonize
将 daemonize no 修改为 daemonize yes


//找到 bind 127.0.0.1，将其删掉


//关闭保护模式，找到protected-mode
将 protected-mode yes 修改为 protected-mode no


//设置密码,找到requirepass
将requirepass foobared 修改为 requirepass 123456
//123456是我自己设置的密码，可以自己设置

```

打开6379端口才可以连接访问得到

```javascript
iptables -I INPUT 1 -p tcp -m state --state NEW -m tcp --dport 6379 -j ACCEPT
```

测试密码有没设置成功的话，可以进入redis的src目录运行

```java
./redis-cli
//会出现127.0.0.1:6379>

//在其中输入set a 1会报下面的错误
//(error) NOAUTH Authentication required.
//这就说明我们密码设置成功了，客户端让我们输入密码才能据需折行的操作

输入auth 123456,即我们刚刚设置的密码，会显示OK，说明我们密码是设置成功的，并且和我们设置的一致
```

## 4、远程连接

上面配置好的话，就可以试试远程连接啦！！！

如果没有连接成功，我也是被坑了好几次，可能有一下几种情况：

### 一、服务器端口没有打开

仅仅使用iptables可能没有起效过，例如我是腾讯云服务器，我还需要在控制台里面打开6379端口，才能远程连接到redis服务器

### 二、有时连接成功了但是长时间不用的话又会连接不上

可以先ps -aux|grep redis，看看有没有redis-server在运行，如果有可能是端口又发疯了。

运行iptables -I INPUT 1 -p tcp -m state --state NEW -m tcp --dport 6379 -j ACCEPT 试试。

如果没有就是被服务器厂家杀后台，可以重新运行redis-server

#### 针对程序被服务器杀死，有以下几种解决方法：

##### 一、使用nohup执行

######  **nohup可以使后面的命令不会响应挂断（SIGHUP）信号。也就是说，通过远程登录执行nohup命令后，即使退出登录后，程序还是会正常执行。通常情况下，nohup命令最后会跟上&字符，表示将这个命令放至后台执行，这样才能真正做到将这个命令放至后台持续的执行。**



###### **例如本来是java -jar xxx.jar，现在是nohub java -jar xxx.jar &**



###### **那么这样，服务器上的程序就会在后台运行了，不会触发消除机制。**

##### 二、使用screen执行

###### **Linux系统默认没有screen工具，需要先进行安装。**



###### **CentOS系列系统安装命令：yum install screen**



###### **Ubuntu 系列系统安装命令：sudo  apt-get  install screen**



###### **创建screen窗口，折行命令：screen -S name，name是自己起的窗口名字，可以随便起**



###### **折行完创建窗口命令后，会进入一个新的窗口，现象就是之前的折行命令的文字效果被清空了**



###### **然后你就可以在这个新的窗口折行你要的操作了，即运行程序**



###### **然后退出这个窗口的命令是：先按ctrl+a，然后按d**



###### **退出后刚刚折行的程序还是会在后台折行，即使关闭了连接也会运行，不会被杀死。**



###### **若想回到刚刚的窗口，折行命令：screen -r -d**



###### **列出在执行的screen窗口，执行命令：screen -ls，会列出所有运行中带有pid的窗口名**



###### **折行screen -r pid，就可以回到指定的窗口，pid指的是screen -ls列出的指定窗口的pid**



###### **关闭指定的窗口进程（杀死）screen -S 进程名 -X quit**



## 5、设置为服务

```shell
 mkdir /etc/redis
```

下面的命令根据redis的安装目录的位置具体操作

```shell
cp /usr/local/redis-5.0.8/redis.conf /etc/redis/6379.conf

cp /usr/local/redis-5.0.8/utils/redis_init_script /etc/init.d/redis_6379
```

 启动&停止

```shell
systemctl start redis_6379.service

systemctl stop redis_6379.service
```

CentOS 6：

```shell
service redis_6379 start

service redis_6379 stop
```



如果是以服务方式启动，原先的redis.conf有修改密码的话，还需要修改脚本`/etc/init.d/reds_6379`，否则停止服务时会报“无权限”错误

```shell
REDISPORT=6379
EXEC=/usr/local/bin/redis-server
CLIEXEC=/usr/local/bin/redis-cli
# 新增下面一行
PASSWORD=123456
...
```

将

```shell
$CLIEXEC -p $REDISPORT shutdown
```

修改为：

```shell
$CLIEXEC -a $PASSWORD -p $REDISPORT shutdown
```

