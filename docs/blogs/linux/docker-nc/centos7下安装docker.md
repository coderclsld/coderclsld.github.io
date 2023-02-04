## centos7下安装docker

### 一、查看内核是否符合安装要求

```powershell
uname -r
```

| centos版本      | 内核要求       |
| --------------- | -------------- |
| centos 7 x64    | 3.10以上       |
| centos 6.5+ x64 | 2.6.32—431以上 |

### 二、卸载旧版本

docker旧版本的名称为docker、docker-engine或者docker-io

如果之前安装过旧版本的要先卸载旧版本，才能安装新版本

```powershell
sudo yum remove docker \
				docker-client \
				docker-client-latest \
				docker-common \
				docker-latest \
				docker-latest-logrotate \
				docker-logrotate \
				docker-selinux \
				docker-engine-selinux \
				docker-engine \
				docker.io
```

### 三、安装依赖包

```powershell
sudo yum install -y yum-utils \
device-mapper-persistent-data \
lvm2
```

### 四、配置镜像仓库

```powershell
#添加docker官方仓库
sudo yum-config-manager \
	--add-repo \
	https://dowmload.docker.com/linux/centos/docker-ce.repo
#添加阿里云镜象仓库
sudo yum-config-manager \
	--add-repo \
	https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

### 五、安装docker

```powershell
sudo yum list docker-ce --showduuplicates | sort -r
#列出可以安装的docker版本
sudo yum install docker-ce
#下载最新版本
sudo ymu install -y docker-ce-18.03.1.ce-1.el7.centos
#安装指定版本
```

### 六、启动docker

```powershell
#启动
sudo systemctl start docker
sudo service start docker
#停止
sudo systemctl stop docker
#重启
sudo systemctl restart docker
#检查docker运行是否正常
sudo docker run hello-world
```

### 七、检查docker是否安装成功

```powershell
#查看docker安装版本号
decker --version
```

### 八、卸载docker

```powershell
sudo yum remove deocker-ce

sudo rm -rf /var/lib/docker
```





