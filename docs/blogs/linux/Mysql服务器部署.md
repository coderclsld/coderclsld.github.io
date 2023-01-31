## centos下mysql的安装和配置远程

#### 下载mysql的 Yum Repository

```
yum -y install mysql57-community-release-el7-10.noarch.rpm
```

#### 上面的是mysql的Yum Repository，现在是yum安装mysql

```
yum -y install mysql57-community-release-el7-10.noarch.rpm
```

####  之后就开始安装MySQL服务器

```
yum -y install mysql-community-server
```

#### 启动MySQL

```
systemctl start  mysqld.service
```

#### 查看MySQL运行状态

```
systemctl status mysqld.service
```

#### 找出root用户的密码

```
grep "password" /var/log/mysqld.log
```

#### 如果找不到,或者是忘记密码的话，折行下面几部操作

1. ##### 	修改MySQL的登录设置：

   ```
   vim /etc/my.cnf
   ```

2. #####    在[mysqld]的段中加上一句：skip-grant-tables

   ```
   例如：
   [mysqld]
   datadir=/var/lib/mysql
   socket=/var/lib/mysql/mysql.sock
   skip-grant-tables
   ```

3. ##### 重新启动mysqld

   ```
   service mysqld restart
   ```

4. ##### 登录并修改MySQL的root密码

   ```
   # mysql
   Welcome to the MySQL monitor. Commands end with ; or \g.
   Your MySQL connection id is 3 to server version: 3.23.56
   Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
   mysql> USE mysql ;
   Database changed
   mysql> UPDATE user SET Password = password ( '你的新密码' ) WHERE User = 'root' ;
   Query OK, 0 rows affected (0.00 sec)
   Rows matched: 2 Changed: 0 Warnings: 0
   mysql> flush privileges ;
   Query OK, 0 rows affected (0.01 sec)
   mysql> quit
   ```

5. ##### 将MySQL的登录设置修改回来

   ```
   vim /etc/my.cnf
   将刚才在[mysqld]的段中加上的skip-grant-tables删除
   ```

6. ##### 重新启动mysqld

   ```
   service mysqld restart
   ```

#### 开启mysql的远程连接

```
在mysql控制台执行:
	grant all privileges on *.* to 'root'@'%' identified by 'root' with grant option;
```

#### 如果有报错说Your password does not satisfy the current policy requirements.

```
进入mysql控制台

//设置密码等级
set global validate_password_policy=0;

//设置密码最小位数
set global validate_password_length=4;

//再次运行  mysql_secure_installation
grant all privileges on *.* to 'root'@'%' identified by 'root' with grant option;
```

#### 设置完成，我发现有些服务器开端口号要在云服务控制面板那里去开端口才有用，直接在远程机子上开端口号可能达不到我们想要的效果



## 附上centos开端口号命令

#### 方式一

##### 1、开启防火墙

```
systemctl start firewalld
```

##### 2、开放指定端口

```
 firewall-cmd --zone=public --add-port=1935/tcp --permanent
 
 命令含义：
--zone #作用域
--add-port=1935/tcp  #添加端口，格式为：端口/通讯协议
--permanent  #永久生效，没有此参数重启后失效
```

##### 3、重启防火墙

```
firewall-cmd --reload
```

##### 4、查看端口号

```
netstat -ntlp   //查看当前所有tcp端口·

netstat -ntulp |grep 1935   //查看所有1935端口使用情况·
```

#### 方式二

##### 开放端口:8080

```
/sbin/iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
```

#### 方式三

```
-A INPUT -m state --state NEW -m tcp -p tcp --dport 8080 -j ACCEPT

service iptables restart
```



