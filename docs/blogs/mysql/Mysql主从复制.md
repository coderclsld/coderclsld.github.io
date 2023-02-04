## mysql主从复制及主机宕机的解决方法

本篇博客仅为学习笔记。

### 概念

​		MySQL主从复制是其最重要的功能之一。主从复制是指一台服务器充当主数据库服务器，另一台或多台服务器充当从数据库服务器，主服务器中的数据自动复制到从服务器之中。对于多级复制，数据库服务器即可充当主机，也可充当从机。MySQL主从复制的基础是主服务器对数据库修改记录二进制日志，从服务器通过主服务器的二进制日志自动执行更新。

### binlog和relaylog的作用

> binlog的主要作用是记录数据库中表的更改，它只记录改变数据的sql，不改变数据的sql不会写入，比如select语句一般不会被记录，因为他们不会对数据产生任何改动。
>
> relay log中（中继日志）中，中继日志也是记录日志更新的信息的

### 为什么需要主从复制

- 提高数据库读写性能，提升系统吞吐量

  ​		在业务复杂的系统中，如果有一条 SQL 语句的执行需要锁表，导致 MySQL 暂时不能提供读的服务，那么就很影响运行中的业务，使用主从复制，让主库负责写，从库负责读，这样即使主库出现了锁表的情景，通过读从库也可以保证业务的正常运作。

  ​		这样读写分离的过程能够是整体的服务性能提高，即使写操作时间比较长，也不影响读操作的进行。

### 主从复制原理

![小白都能懂的Mysql主从复制原理（原理+实操）3](https://res-static.hc-cdn.cn/fms/img/e5e05b7b5cfd963c94c23a970564041f1603768896154)

Mysql的主从复制中主要有三个线程：`binlog dump thread、slave的I/O thread 、SQL thread）`。

> 当Master有数据更新的时候，会按照binlog 的格式，将更新的事件类型写入master的binlog文件中，创建binlog dump thread通知slave说master库中有数据更新，此时slave接收到通知之后，会创建I/O thread来请求master，master会返回binlog文件的副本以及数据更新的位置，slave收到binlog副本文件后，将文件保存在relay log中（中继日志）中，中继日志也是记录日志更新的信息的，随后sql thread在slave中创建，将更新的内容同步到slave数据库中，这样就保证了主从的数据同步。

以上就是主从复制的过程，当然，主从复制的过程有不同的策略方式进行数据的同步，主要包含以下几种：

同步策略：Master会等待所有的slave都回应后才会提交，这会使主从同步的性能严重的影响

半同步策略：Master至少会等待一个slave回应后在提交

异步策略：Master不用等待slave回应就可以提交

延迟策略：slave要落后Master指定的时间

### 主从搭建

#### 删除mysql

这里提供centos7下完全卸载MySQL的方法

> 首先检查centos 7里面的Mysql安装包和依赖包：

> ```shell
> rpm -qa |grep mysql
> ```
>
> 接着可以删除上面的安装包和依赖包：
>
> ```shell
> sudo yum remove mysql*
> ```
>
> 继续检查一下是否存在Mariadb，若是存在直接删除Mariadb
>
> ```shell
> // 检查是否存在Mariadb
> rpm -qa |grep mariadb
> // 删除Mariadb
> sudo rpm -e --nodeps mariadb-libs-xxxxx.el7.x86_64
> ```
>
> 然后，就是删除Mysql的配置文件，可以使用下面的命令查找Msqyl配置文件的路径：
>
> ```shell
> sudo find / -name mysql
> ```
>
> 然后，通过下面的命令，将他们逐一删除：
>
> ```shell
> sudo rm -rf /usr/lib64/mysql
> ..........
> ```
>
> 接着就开始安装Mysql 8了，使用wget命令下载Mysql 8的repo源，并且执行安装：
>
> ```shell
> wget https://repo.mysql.com//mysql80-community-release-el7-3.noarch.rpm
> sudo yum -y install mysql80-community-release-el7-3.noarch.rpm
> ```

> 安装完后会在/etc/yum.repos.d/目录下生成下面的两个文件，说明安装成功了：
>
> mysql-community.repo
> mysql-community-source.repo
>
> 安装完Mysql8后，接着来更新一下yum源，并且查看yum仓库中的Mysql：
>
> ```shell
> // 更新yum源
> yum clean all
> yum makecache
> // 查看yum仓库中的Mysql
> yum list | grep mysql
> ```
>
> 可以查看到仓库中存在mysql-community-server.x86_64，直接安装就行了：
>
> ```javascript
> sudo yum -y install mysql-community-server
> ```
>
> 接着启动Mysql，并检查Mysql的状态：
>
> ```javascript
> // 启动Mysql
> systemctl start  mysqld.service
> // 检查Mysql的状态
> systemctl status mysqld
> ```

[修改密码参考此链接的博客](https://blog.csdn.net/weixin_43640848/article/details/113064552?spm=1001.2014.3001.5501)

#### 开始搭建

这里使用的使用两台centos 7的vmware的ip分别是`192.168.163.155（Slave）`和`192.168.163.156（Master）`作为测试，首先在192.168.163.156（Master）中创建一个测试库test：

```javascript
// 创建测试库
create database test default character set utf8mb4 collate utf8mb4_general_ci;
// 并且授权
grant all privileges on test.* to 'test'@'%';
```

然后编辑Master中的my.cnf文件，此文件位于/etc/my.cnf，执行下面的sql，并添加下面的信息：

```javascript
sudo vi /etc/my.cnf

==========以下是配置文件中的信息=============
# 配置编码为utf8
character_set_server=utf8mb4
init_connect='SET NAMES utf8mb4'

# 配置要给Slave同步的数据库
binlog-do-db=test
# 不用给Slave同步的数据库，一般是Mysql自带的数据库就不用给Slave同步了
binlog-ignore-db=mysql
binlog-ignore-db=information_schema
binlog-ignore-db=performance_schema
binlog-ignore-db=sys
# 自动清理30天前的log文件
expire_logs_days=30
# 启用二进制日志
log-bin=mysql-bin
# Master的id，这个要唯一，唯一是值，在主从中唯一
server-id=3
```

配置完后重启Mysql服务，并查看Mysql的log_bin日志是否启动成功：

```javascript
systemctl restart mysqld
# 查看log_bin日志是否启动成功
show variables like '%log_bin%';
```

![小白都能懂的Mysql主从复制原理（原理+实操）10](https://res-static.hc-cdn.cn/fms/img/e4f43074b2ac347b63eb72413cc238d51603768896155)

接着查看Master的状态：

```javascript
show master status;
```

![小白都能懂的Mysql主从复制原理（原理+实操）11](https://res-static.hc-cdn.cn/fms/img/378a21cfaace770d4c2612f488e286d11603768896155)

这两个数据`File`和`Position`要记住，后面配置Slave的时候要使用到这两个数据。

最后登陆Master的数据库，并创建一个用户用于同步数据：

```javascript
create user 'backup'@'%' IDENTIFIED BY 'LDCldc-2020';
grant file on *.* to 'backup'@'%';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* to 'backup'@'%';
```

到这里Master的配置就配置完了，后面就进行Slave的配置。

在Slave中同样要创建test数据库，并且授权给test用户

```javascript
# 创建同步数据的test数据库
create database test default character set utf8mb4 collate utf8mb4_general_ci;
# 授权
grant all privileges on test.* to 'test'@'%';
```

接着编辑Slave中my.cnf文件，同样是在/etc/my.cnf路径下，加入如下配置：

```javascript
# 配置从服务器的ID，唯一的
server-id=4
#加上以下参数可以避免更新不及时，SLAVE 重启后导致的主从复制出错。
read_only = 1
master_info_repository=TABLE
relay_log_info_repository=TABLE
```

并且重启Slave中的Mysql服务：

```javascript
systemctl restart mysqld
```

在Slave中添加Master的信息：

```javascript
# master_host是Master的ip，master_log_file和master_log_pos就是配置之前查看Master状态时显示的File和Position信息
change master to master_host='192.168.163.156',master_port=3306,master_user='backup',master_password='LDCldc-2020',master_log_file='mysql-bin.000001',master_log_pos=1513; 
```

最后查看Slave的状态：

```javascript
show slave status\G
```

![小白都能懂的Mysql主从复制原理（原理+实操）12](https://res-static.hc-cdn.cn/fms/img/33e958b62244225ced7111c1dfd6d72b1603768896156)

当看到`Slave_IO_Running`和`Slave_SQL_Running`都是yes的时候，这表示主从配置成功。

**「Slave_IO_Running也就是Slave中的IO线程用于请求Master，Slave_SQL_Running时sql线程将中继日志中更新日志同步到Slave数据库中。」**

但是，有时候Slave_IO_Running会为no，而Slave_SQL_Running为yes

首先看重启一下`Slave`的MySQL服务：`systemctl restart mysqld`，然后执行：

```javascript
stop slave;
start slave;
```

这样就能够使`Slave_IO_Running`和`Slave_SQL_Running`显示都是yes了

### Mysql主机宕机的解决方法

​		假设我们有三个机子

master： 192.168.80.130

slave：192.168.80.143

slave：192.168.80.146

​		首先模拟（MySQL---master）宕机：

```shell
service mysqld stop
```

​		当master宕机后去slave去查看是否出现错误信息

```mysql
show slave status\G;
```

![img](https://blog-1300924781.cos.ap-guangzhou.myqcloud.com/blog/3d02e4e4a3fa4fcb34cbe8d78f59731df1e.png)

​		这时两台SLAVE主机已经连接不上MASTER

​		IO进程和sql进程状态：Slave_IO_Running: Connecting(该状态表示会一直尝试重连主，如果主正常了，该进程状态会自动变成Yes)，此时，master不能提供读写服务。我们想将其中最新的slave提升为主。

​		具体操作步骤如下：

1、在每个SLAVE库上执行：

```mysql
stop  slave io_thread;

show  processlist;
```

直到看到Slave has read all relay log; waitingfor more updates,则表示从库更新都执行完毕了

2、 选择新的主库

​		对比选择Relay_Master_Log_File,Exec_Master_Log_Pos最大的作为新的主库，这里我们选择slave1为新的主库

​		其实，如果两个从IO进程一直都是正常，没有落后于主，且relay log都已经重放完成，两个从是一样的，选择哪个都可以。

​		这里选择slave1作为新主。

3、进行相应配置

​		登陆slave1，执行stop slave;并进入数据库目录，删除master.info和relay-log.info文件（删除前，可以先备份下这俩文件）；

​		配置my.cnf文件，开启log-bin,如果有log-slaves-updates=1和read-only=1则要注释掉，然后重启slave1.

4、 reset master

> 在slave1上reset master，会重新生成二进制日志。
>
> mysql> reset master;
>
> Query OK, 0 rows affected (0.02 sec)
>
> mysql> show master status;
> +------------------+----------+--------------+------------------+
> | File | Position | Binlog_Do_DB | Binlog_Ignore_DB |
> +------------------+----------+--------------+------------------+
> | mysql-log.000001 | 399 |        |            |
> +------------------+----------+--------------+------------------+
> 1 row in set (0.00 sec)

5、创建用于同步的用户

如果slave1完全同步master的话，这步可以省略。

6、 slave2指向slave1

```mysql
mysql>change master to master_user='RepUser',master_password='beijing',master_host='192.168.80.134',master_port=3306,master_log_file='mysql-bin.000001',master_log_pos=154;

mysql>start slave;
```

