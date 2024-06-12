## Service

### 核心原理

Service 是由 kube-proxy 组件，加上 iptables 来共同实现的

我们创建名叫 hostnames 的 Service 来说，一旦它被提交给 Kubernetes，那么 kube-proxy 就可以通过 Service 的 Informer 感知到这样一个 Service 对象的添加。而作为对这个事件的响应，它就会在宿主机上创建这样一条 iptables 规则

`-A KUBE-SERVICES -d 10.0.1.175/32 -p tcp -m comment --comment "default/hostnames: cluster IP" -m tcp --dport 80 -j KUBE-SVC-NWV5X2332I4OT4T3`

这条 iptables 规则的含义是：凡是目的地址是 10.0.1.175、目的端口是 80 的 IP 包，都应该跳转到另外一条名叫 KUBE-SVC-NWV5X2332I4OT4T3 的 iptables 链进行处理

kube-proxy 通过 iptables 处理 Service 的过程，其实需要在宿主机上设置相当多的 iptables 规则。而且，kube-proxy 还需要在控制循环里不断地刷新这些规则来确保它们始终是正确的。**基于 iptables 的 Service 实现，都是制约 Kubernetes 项目承载更多量级的 Pod 的主要障碍。**IPVS 模式的 Service，就是解决这个问题的一个行之有效的方法，IPVS 模式的工作原理，其实跟 iptables 模式类似。当我们创建了前面的 Service 之后，kube-proxy 首先会在宿主机上创建一个虚拟网卡（叫作：kube-ipvs0），并为它分配 Service VIP 作为 IP 地址

相比于 iptables，IPVS 在内核中的实现其实也是基于 Netfilter 的 NAT 模式，所以在转发这一层上，理论上 IPVS 并没有显著的性能提升。但是，**IPVS 并不需要在宿主机上为每个 Pod 设置 iptables 规则，而是把对这些“规则”的处理放到了内核态，从而极大地降低了维护这些规则的代价**

在 Kubernetes 中，Service 和 Pod 都会被分配对应的 DNS A 记录（从域名解析 IP 的记录）。

- ClusterIP：`<serviceName>.<namespace>.svc.cluster.local`
- Headless Service：`<podName>.<serviceName>.<namesapce>.svc.cluster.local`

### 访问方法

Service 的四种访问方式如下：

- 1）ClusterIP：通过集群的内部 IP 暴露服务，选择该值时服务只能够在集群内部访问。
- 2）NodePort：通过每个节点上的 IP 和静态端口（`NodePort`）暴露服务。 `NodePort` 服务会路由到自动创建的 `ClusterIP` 服务。 通过请求 `<节点 IP>:<节点端口>`，你可以从集群的外部访问一个 `NodePort` 服务。
- 3）LoadBalancer：使用云提供商的负载均衡器向外部暴露服务。 外部负载均衡器可以将流量路由到自动创建的 `NodePort` 服务和 `ClusterIP` 服务上。
- 4）ExternalName：通过返回 `CNAME` 和对应值，可以将服务映射到 `externalName` 字段的内容（例如，`foo.bar.example.com`）。 无需创建任何类型代理。

其中 ClusterIP 为默认方式，只能集群内部访问。NodePort、LoadBalancer 则是向外暴露服务的同时将流量路由到 ClusterIP服务。ExternalName 则是CNAME方式进行服务映射。

#### ClusterIP

`ClusterIP`也是 Service 的默认访问方式。

根据是否生成 ClusterIP 又可分为普通 Service 和 Headless Service 两类：

- 普通 Service：通过为 Kubernetes 的 Service 分配一个集群内部可访问的`固定虚拟IP`（Cluster IP），实现集群内的访问，为最常见的方式。
- Headless Service：该服务不会分配 Cluster IP，也不通过 kube-proxy 做反向代理和负载均衡。而是通过 DNS 提供稳定的网络络 ID 来访问，DNS 会将Headless Service 的后端（endpoints）直接解析为 PodIP 列表，主要供 StatefulSet 使用。

####  NodePort

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-nginx
  labels:
    run: my-nginx
spec:
  type: NodePort
  ports:
  - port: 8080
    targetPort: 80
    protocol: TCP
    name: http
    #nodePort: 31703
  - port: 443
    protocol: TCP
    name: https
    #nodePort: 31704
  selector:
    app: nginx
```

在这个 Service 的定义里，我们声明它的类型是，type=NodePort。然后，我在 ports 字段里声明了 Service 的 8080 端口代理 Pod 的 80 端口，Service 的 443 端口代理 Pod 的 443 端口。如果你不显式地声明 nodePort 字段，Kubernetes 就会为你分配随机的可用端口来设置代理。这个端口的范围默认是 30000-32767，你可以通过 kube-apiserver 的–service-node-port-range 参数来修改它。

#### LoadBalancer

从外部访问 Service 的第二种方式，适用于公有云上的 Kubernetes 服务。这时候，你可以指定一个 LoadBalancer 类型的 Service。

```yaml
---
kind: Service
apiVersion: v1
metadata:
  name: example-service
spec:
  ports:
  - port: 8765
    targetPort: 9376
  selector:
    app: example
  type: LoadBalancer

```

在公有云提供的 Kubernetes 服务里，都使用了一个叫作 CloudProvider 的转接层，来跟公有云本身的 API 进行对接。

所以，**在上述 LoadBalancer 类型的 Service 被提交后，Kubernetes 就会调用 CloudProvider 在公有云上为你创建一个负载均衡服务，并且把被代理的 Pod 的 IP 地址配置给负载均衡服务做后端**。

#### ExternalName

而第三种方式，是 Kubernetes 在 1.7 之后支持的一个新特性，叫作 ExternalName。举个例子：

```yaml
kind: Service
apiVersion: v1
metadata:
  name: my-service
spec:
  type: ExternalName
  externalName: my.database.example.com

```

在上述 Service 的 YAML 文件中，我指定了一个 externalName=my.database.example.com 的字段。而且你应该会注意到，这个 YAML 文件里不需要指定 selector。

这时候，当你通过 Service 的 DNS 名字访问它的时候，比如访问：my-service.default.svc.cluster.local。那么，Kubernetes 为你返回的就是my.database.example.com。

所以说，**ExternalName 类型的 Service，其实是在 kube-dns 里为你添加了一条 CNAME 记录**。

这时，访问 my-service.default.svc.cluster.local 就和访问 my.database.example.com 这个域名是一个效果了。

此外，Kubernetes 的 Service 还允许你为 Service 分配公有 IP 地址，比如下面这个例子：

```yaml
kind: Service
apiVersion: v1
metadata:
  name: my-service
spec:
  selector:
    app: MyApp
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 9376
  externalIPs:
  - 80.11.12.10
```

在上述 Service 中，我为它指定的 externalIPs=80.11.12.10，那么此时，你就可以通过访问 80.11.12.10:80 访问到被代理的 Pod 了



## ConfigMap And Secret

>  Kubernetes 中的几种 Projected Volume，包括 ConfigMap、Secret、Downward API、ServiceAccountToken等

在kubernetes中有几种特殊的Volume，他们存在的意义不是为了存放容器里面的数据，也不是用来进行容器和宿主机之前的数据交换，这些特殊volume的作用是为容器提供预先定义好的数据。

ConfigMap顾名思义就是用于保存配置数据的键值对，可以用来保存单个属性，也可以用来保存配置文件。

Secret可以为pod提供密码、token、私钥等铭感数据对于一些非敏感数据可以使用应用的配置信息，也可以使用configMap

Downward API，作用是让pod里的容器能够直接获取到这个pod api对象本身的信息。

ServiceAccountToken 一种特殊的 Secret，是 Kubernetes 系统内置的一种“服务账户”，它是 Kubernetes 进行权限分配的对象。为了方便使用，Kubernetes 已经为你提供了一个默认“服务账户”（default Service Account）。并且，任何一个运行在 Kubernetes 里的 Pod，都可以直接使用这个默认的 Service Account，而无需显示地声明挂载它（k8s 默认会为每一个Pod 都挂载该Volume）

其实，Secret、ConfigMap，以及 Downward API 这三种 Projected Volume 定义的信息，大多还可以通过环境变量的方式出现在容器里。但是，通过环境变量获取这些信息的方式，不具备自动更新的能力。**所以，一般情况下，都建议使用 Volume 文件的方式获取这些信息**，Volume 方式可以自动更新，不过可能会有一定延迟

### configMap

```yaml
kubectl create configmap
kubectl delete configmap name
kubectl edit configmap name
kubectl get configmap
kubectl describe configmap name
```

可以使用 `kubectl create configmap` 从以下多种方式创建 ConfigMap。

- **yaml 描述文件**：事先写好标准的configmap的yaml文件，然后kubectl create -f 创建
- **–from-file**：通过指定目录或文件创建，将一个或多个配置文件创建为一个ConfigMap
- **–from-literal**：通过直接在命令行中通过 key-value 字符串方式指定configmap参数创建
- **–from-env-file**：从 env 文件读取配置信息并创建为一个ConfigMap

Pod可以通过三种方式来使用configMap，分别为：

- 将configmap中的数据设置为环境变量
- 使用volume将configmap作为文件或目录挂载

ConfigMap必须在pod使用它之前创建、使用envFrom时，建辉自动忽略无效的键、一个pod只能使用同一个命名空间的configmap

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - image: busybox
    name: app
    volumeMounts:
    - mountPath: /etc/foo
      name: foo
      readOnly: true
    args:
    - /bin/sh
    - -c
    - sleep 10; touch /tmp/healthy; sleep 30000
  volumes:
  - name: foo
    configMap:
      name: cm1

```

### Secret

Secret 和 Configmap 类似，不过 Secret 是加密后的，一般用于存储敏感数据，如 比如密码，token，密钥等。

Secret有三种类型：

- 1）**Opaque**：base64 编码格式的 Secret，用来存储密码、密钥等；但数据也可以通过base64 –decode解码得到原始数据，所以加密性很弱。
- 2）**Service Account**：用来访问Kubernetes API，由Kubernetes自动创建，并且会自动挂载到Pod的 /run/secrets/kubernetes.io/serviceaccount 目录中。
- 3）**kubernetes.io/dockerconfigjson** ： 用来存储私有docker registry的认证信息。

### Downward API

它的作用是：让 Pod 里的容器能够直接获取到这个 Pod API 对象本身的信息。

不过，需要注意的是，Downward API 能够获取到的信息，**一定是 Pod 里的容器进程启动之前就能够确定下来的信息**。



## Pod

为什么 Kubernetes 项目又突然搞出一个 Pod 来呢？**为了更好的管理**

Kubernetes 真正处理的，还是宿主机操作系统上 Linux 容器的 Namespace 和 Cgroups，而并不存在一个所谓的 Pod 的边界或者隔离环境。

**Pod 这个看似复杂的 API 对象，实际上就是对容器的进一步抽象和封装而已，其实是一组共享了某些资源的容器。**

具体的说：Pod 里的所有容器，共享的是同一个 Network Namespace，并且可以声明共享同一个 Volume。在 Pod 中，Infra 容器永远都是第一个被创建的容器，而其他用户定义的容器，则通过 Join Network Namespace 的方式，与 Infra 容器关联在一起。

Pod 生命周期的变化，主要体现在 Pod API 对象的 Status 部分，这是它除了 Metadata 和 Spec 之外的第三个重要字段。其中，pod.status.phase，就是 Pod 的当前状态，它有如下几种可能的情况：

1. **Pending**。这个状态意味着，Pod 的 YAML 文件已经提交给了 Kubernetes，API 对象已经被创建并保存在 Etcd 当中。但是，这个 Pod 里有些容器因为某种原因而不能被顺利创建。比如，调度不成功。
2. **Running**。这个状态下，Pod 已经调度成功，跟一个具体的节点绑定。它包含的容器都已经创建成功，并且至少有一个正在运行中。
3. **Succeeded**。这个状态意味着，Pod 里的所有容器都正常运行完毕，并且已经退出了。这种情况在运行一次性任务时最为常见。
4. **Failed**。这个状态下，Pod 里至少有一个容器以不正常的状态（非 0 的返回码）退出。这个状态的出现，意味着你得想办法 Debug 这个容器的应用，比如查看 Pod 的 Events 和日志。
5. **Unknown**。这是一个异常状态，意味着 Pod 的状态不能持续地被 kubelet 汇报给 kube-apiserver，这很有可能是主从节点（Master 和 Kubelet）间的通信出现了问题。

## Deployment

Deployment 是 Kubernetes 中最常见的控制器，实际上它是一个**两层控制器**。

- 首先，它通过 **ReplicaSet 的个数**来描述应用的版本；
- 然后，它再通过 **ReplicaSet 的属性**（比如 replicas 的值），来保证 Pod 的副本数量。

Deployment 是 Kubernetes 编排能力的一种提现，通过 Deployment 我们可以让 Pod 稳定的维持在指定的数量，除此之外还有滚动更新、版本回滚等功能。

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.7.9
        ports:
        - containerPort: 80

```

这个 Deployment 定义的编排动作非常简单，即：确保携带了 app=nginx 标签的 Pod 的个数，永远等于 spec.replicas 指定的个数，即 2 个。这就意味着，如果在这个集群中，携带 app=nginx 标签的 Pod 的个数大于 2 的时候，就会有旧的 Pod 被删除；反之，就会有新的 Pod 被创建。

接下来，以 Deployment 为例，我和你简单描述一下它对控制器模型的实现：

- 1）Deployment 控制器从 Etcd 中获取到所有携带了“app: nginx”标签的 Pod，然后统计它们的数量，这就是实际状态；
- 2）Deployment 对象的 Replicas 字段的值就是期望状态；
- 3）Deployment 控制器将两个状态做比较，然后根据比较结果，确定是创建 Pod，还是删除已有的 Pod。

而被控制对象的定义，则来自于一个“模板”。比如，Deployment 里的 template 字段



## Volume

> 远程卷的 Attach、Mount 过程，CRI Mount Volume 实现以及 PV、PVC、StorageClass 持久化存储体系运作流程

k8s 中的 **Volume** 属于 Pod 内部共享资源存储，生命周期和 Pod 相同，与 Container 无关，即使 Pod 上的容器停止或者重启，Volume 不会受到影响，但是如果 Pod 终止，那么这个 Volume 的生命周期也将结束。

这样的存储无法满足有状态服务的需求，于是推出了 **Persistent Volume**，故名思义，持久卷是能将数据进行持久化存储的一种资源对象。它是独立于Pod的一种资源，是一种网络存储，它的生命周期和 Pod 无关。云原生的时代，持久卷的种类也包括很多，iSCSI，RBD，NFS，以及CSI, CephFS, OpenSDS, Glusterfs, Cinder 等网络存储。

- PV ：持久化存储数据卷
- PVC：PV 使用请求
- StorageClass：PV 的创建模板

在 PV & PVC 出现之前，k8s 其实也是支持持久化存储的。

比如要使用一个 hostpath 类型的 volume，pod yaml 只需要这么写：

```yaml
apiVersion: v1
kind: Pod
metadata:
   name: busybox
spec:
  containers:
   - name : busybox
     image: registry.fjhb.cn/busybox
     imagePullPolicy: IfNotPresent
     command:
      - sleep
      - "3600"
     volumeMounts:
      - mountPath: /busybox-data
        name: data
  volumes:
   - hostPath:
      path: /tmp
     name: data

```

### PV

PV 描述的是持久化存储数据卷。

假设我们在远程存储服务那边创建一块空间，用于作为某个 Pod 的 Volume，比如：NFS 下的某个目录或者某个 Ceph RDB 服务。PV 对象就是用于代表持久化存储数据卷的，需要关联到专业的存储知识。

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs
spec:
  storageClassName: manualStorageClass
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: 10.244.1.4
    path: "/"
```

### PVC

PVC 描述的是对持久化存储数据卷的需求，作为一个开发人员，可能不懂存储，因此创建 PV 需要的这些字段不知道怎么填。为了减轻使用负担，k8s 推出 PV 的同时还推出了 PVC，只需要指定需要的访问模式以及需要的存储空间大小即可，完全不用管专业的存储知识。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: manual
  resources:
    requests:
      storage: 1Gi
```

### StorageClass

StorageClass 其中的一个作用是关联 PV 和 PVC，只有 StorageClass 相同的 PV 和 PVC 才会被绑定在一起。另一个作用则是充当 PV 的模板，用于实现动态创建 PV，也就是 k8s 中的 **Dynamic Provisioning** 机制。将 PV 和 PVC 分开后使用上确实简单了，但是由于二者分别由不同用户创建，很可能出现创建了 PVC 找不到相匹配的 PV 的情况，毕竟运维人员也不知道需要那些类型的 PV。为了解决这个问题， k8s 又推出了 StorageClass 以及 **Dynamic Provisioning** 机制。根据 PVC 以及 StorageClass 自动创建 PV，极大降低了运维人员的工作量。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-sc
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
parameters:
  archiveOnDelete: "false"
reclaimPolicy: "Delete"
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner-nfs-sc
```

光有 StorageClass 是没法自动创建出 PV 的，还需要一个配套的 provisioner组件才行。



PVC 和 PV 绑定之后就可以使用了，创建一个 Pod 来使用这个 PVC：

```yaml
kind: Pod
apiVersion: v1
metadata:
  name: test-pod
spec:
  containers:
  - name: test-pod
    image: busybox:stable
    command:
      - "/bin/sh"
    args:
      - "-c"
      - "touch /mnt/SUCCESS && exit 0 || exit 1"
    volumeMounts:
      - name: nfs-pvc
        mountPath: "/mnt"
  restartPolicy: "Never"
  volumes:
    - name: nfs-pvc
      persistentVolumeClaim:
        claimName: test-claim

```

这里就是通过 claimName 来指定要使用的 PVC。Pod 创建之后 k8s 就可以根据 claimName 找到对应 PVC，然后 PVC 绑定的时候会把 PV 的名字填到 spec.volumeName 字段上，因此这里又可以找到对应的 PV



