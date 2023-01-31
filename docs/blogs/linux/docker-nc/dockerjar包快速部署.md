## docker的jar包快速部署运行



### 一、docker的安装

#### 1、检查内核版本

Docker 要求 CentOS 系统的内核版本高于 3.10

```
uname -r
```

如若你的 CentOS7 系统的内核版本低于了 3.10

#### 2、升级软件包及内核

```
yum update
```

#### 3、安装Docker

```
yum install docker
```

#### 4、启动Docker

```
systemctl start docker
```

#### 5、查看 Docker 版本信息以检查是否安装成功：

```
docker -v
```

#### 6、设置开机启动

```
systemctl enable docker
```





### 二、生产环境配置



#### 安装Mysql

- ##### 下载MySQL`5.7`的docker镜像：

```shell
docker pull mysql:5.7
```

- ##### 使用如下命令启动MySQL服务：

```shell
docker run -p 3306:3306 --name mysql \
-v /mydata/mysql/log:/var/log/mysql \
-v /mydata/mysql/data:/var/lib/mysql \
-v /mydata/mysql/conf:/etc/mysql \
-e MYSQL_ROOT_PASSWORD=root  \
-d mysql:5.7
```

- ##### 参数说明

```
-p 3306:3306：将容器的3306端口映射到主机的3306端口
-v /mydata/mysql/conf:/etc/mysql：将配置文件夹挂在到主机
-v /mydata/mysql/log:/var/log/mysql：将日志文件夹挂载到主机
-v /mydata/mysql/data:/var/lib/mysql/：将数据文件夹挂载到主机
-e MYSQL_ROOT_PASSWORD=root：初始化root用户的密码
```

- ##### 进入运行MySQL的docker容器：

```shell
docker exec -it mysql /bin/bash
```

- ##### 使用MySQL命令打开客户端：

```shell
mysql -uroot -proot --default-character-set=utf8
```

- ##### 安装上传下载插件，并将/mydata/chat.sql上传到Linux服务器上：

```shell
yum -y install lrzsz
```

- ##### 此插件可以将文件拷贝到docker的镜像中

```shell
docker cp /mydata/chat.sql mysql:/
```

- ##### 进入mysql容器

```shell
docker exec -it mysql /bin/bash
```

- ##### 进入mysql

```shell
mysql -uroot -proot
```

- ##### 将sql文件导入到数据库

```shell
source /mall.sql;
```



#### Redis安装

- ##### 下载Redis`5.0`的docker镜像：

  ```shell
  docker pull redis:5
  ```

- ##### 使用如下命令启动Redis服务：

  ```shell
  docker run -p 6379:6379 --name redis \
  -v /mydata/redis/data:/data \
  -d redis:5 redis-server --appendonly yes \
  --requirepass "root"
  ```

- ##### 进入Redis容器使用`redis-cli`命令进行连接：

  ```shell
  docker exec -it redis redis-cli
  ```



#### mongodb安装

- ##### 下载MongoDB`4.2.5`的docker镜像：

  ```shell
  docker pull mongo:4.2.5
  ```

- ##### 使用docker命令启动：

  ```shell
  docker run -p 27017:27017 --name mongo \
  -v /mydata/mongo/db:/data/db \
  -d mongo:4.2.5
  ```





### 三、使用maven插件为springboot应用构建docker镜像



#### Docker Registry 2.0搭建

```shell
docker run -d -p 5000:5000 --restart=always --name registry2 registry:2
```



#### Docker开启远程API

- ##### 用vim编辑器修改docker.service文件

```shell
vim /usr/lib/systemd/system/docker.service
```

- ##### 需要修改的部分：

```
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
```

- ##### 修改后的部分：

```shell
ExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H unix://var/run/docker.sock
```

- ##### 让Docker支持http上传镜像

```shell
echo '{ "insecure-registries":["192.168.3.101:5000"] }' > /etc/docker/daemon.json
```

- ##### 修改配置后需要使用如下命令使配置生效

```sh
systemctl daemon-reload
```

- ##### 重新启动Docker服务

```shell
systemctl stop docker
systemctl start docker
```

- ##### 开启防火墙的Docker构建端口

```shell
firewall-cmd --zone=public --add-port=2375/tcp --permanent
firewall-cmd --reload
```

- ##### 在应用的pom.xml文件中添加docker-maven-plugin的依赖

```xml
<groupId>org.example</groupId>
    <artifactId>chat</artifactId>
    <version>1.0-SNAPSHOT</version>
    <name>chat</name>
<description>Demo project for Spring Boot</description>
<properties>
    <java.version>1.8</java.version>
    <docker.host>http://47.112.99.56:2375</docker.host>
</properties>

 <dependency>
     <groupId>com.spotify</groupId>
     <artifactId>docker-maven-plugin</artifactId>
     <version>1.2.2</version>
</dependency>
<build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>com.spotify</groupId>
                <artifactId>docker-maven-plugin</artifactId>
                <version>1.1.0</version>
                <executions>
                    <execution>
                        <id>build-image</id>
                        <phase>package</phase>
                        <goals>
                            <goal>build</goal>
                        </goals>
                    </execution>
                </executions>
                <configuration>
                    <imageName>school/${project.artifactId}</imageName>
                    <dockerHost>http://47.112.99.56:2375</dockerHost>
                    <baseImage>java:8</baseImage>
                    <entryPoint>["java", "-jar","/${project.build.finalName}.jar"]
                    </entryPoint>
                    <resources>
                        <resource>
                            <targetPath>/</targetPath>
                            <directory>${project.build.directory}</directory>
                            <include>${project.build.finalName}.jar</include>
                        </resource>
                    </resources>
                </configuration>
            </plugin>
    </plugins>
</build>
```



##### 相关配置说明：

- executions.execution.phase:此处配置了在maven打包应用时构建docker镜像；
- imageName：用于指定镜像名称，mall-tiny是仓库名称，`${project.artifactId}`为镜像名称，`${project.version}`为仓库名称；
- dockerHost：打包后上传到的docker服务器地址；
- baseImage：该应用所依赖的基础镜像，此处为java；
- entryPoint：docker容器启动时执行的命令；
- resources.resource.targetPath：将打包后的资源文件复制到该目录；
- resources.resource.directory：需要复制的文件所在目录，maven打包的应用jar包保存在target目录下面；
- resources.resource.include：需要复制的文件，打包好的应用jar包。



##### 其他项目说明：

- springboot里面mysql和redis的地址用服务器的地址即可，记得密码和用户名要配置好

##### 使用IDEA打包项目并构建镜像

![img](https://blog-1300924781.cos.ap-guangzhou.myqcloud.com/blog/refer_screen_68.png)

![img](https://blog-1300924781.cos.ap-guangzhou.myqcloud.com/blog/refer_screen_66.png)

![image-20210309002805046](https://blog-1300924781.cos.ap-guangzhou.myqcloud.com/blog/image-20210309002805046.png)



#### 通过下面的命令运行镜像

```shell
docker -p 8080:8080 --name chat -d school/chat:latest
```

#### 查看运行的容器

```shell
docker ps
```

#### 查看存在的容器（包括死了的容器）

```shell
docker ps -a
```

如果打包后的镜像上传上去的话立马就退出了，那就是jar包有问题，建议在idea中间jar包拷出到桌面java -jar xxx.jar一下看看能不能运行成功

