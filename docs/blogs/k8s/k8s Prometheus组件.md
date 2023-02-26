# k8s Prometheus组件



## node-exporter

### 介绍

>  node-exporter可以采集机器（物理机、虚拟机、云主机等）的监控指标数据，能够采集到的指标数据包括CPU、内存、磁盘、网络、文件数等信息。

### 安装配置

```shell
#创建命名空间 master
kubectl create ns monitor
#把node-epxorter.tar.gz镜像压缩包上传到k8s节点后手动解压 master and node
docker load -i node-exporter.tag.gz
#创建目录放置配置文件 master
mkdir prometheus
cd prometheus
vim node-export.yaml	#yaml文件内容见下方 
#部署 master
kubectl apply -f node-exporter.yaml
#查看是否部署成功 master
kubectl get pods -n monitor
#通过node-exporter采集数据，node-exporter默认监听端口9100，可以看到当前主机获取到的所有监控数据
curl http://192.168.78.143:9100/metrics
#查看CPU使用情况
curl http://192.168.78.143:9100/metrics | grep node_cpu_seconds
```

#### node-export.yaml

```yaml
apiVersion: apps/v1
kind: DaemonSet	# 可以保证 k8s 集群的每个节点都运行完全一样的 pod
metadata:
  name: node-exporter
  namespace: monitor
  labels:
    name: node-exporter
spec:
  selector:
    matchLabels:
     name: node-exporter
  template:
    metadata:
      labels:
        name: node-exporter
    spec:
      hostPID: true	# hostNetwork、hostIPC、hostPID 都为 True 时，表示这个 Pod 里的所有容器，会直接使用宿主机的网络，直接与宿主机进行 IPC（进程间通信）通信，可以看到宿主机里正在运行的所有进程。加入了 hostNetwork:true 会直接将我们的宿主机的 9100 端口映射出来，从而不需要创建 service 在我们的宿主机上就会有一个 9100 的端口。
      hostIPC: true
      hostNetwork: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v0.16.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 9100
        resources:
          requests:
            cpu: 0.15         # 这个容器运行至少需要 0.15 核 cpu
        securityContext:
          privileged: true    # 开启特权模式
        args:
        - --path.procfs       # 配置挂载宿主机（node 节点）的路径
        - /host/proc
        - --path.sysfs        # 配置挂载宿主机（node 节点）的路径
        - /host/sys
        - --collector.filesystem.ignored-mount-points
        - '"^/(sys|proc|dev|host|etc)($|/)"'    # 通过正则表达式忽略某些文件系统挂载点的信息收集
        volumeMounts:         # 将主机 /dev、/proc、/sys 这些目录挂在到容器中，这是因为我们采集的很多节点数据都是通过这些文件来获取系统信息的           
        - name: dev
          mountPath: /host/dev
        - name: proc
          mountPath: /host/proc
        - name: sys
          mountPath: /host/sys
        - name: rootfs
          mountPath: /rootfs
      tolerations:
      - key: "node-role.kubernetes.io/master"
        operator: "Exists"
        effect: "NoSchedule"
      volumes:
        - name: proc
          hostPath:
            path: /proc
        - name: dev
          hostPath:
            path: /dev
        - name: sys
          hostPath:
            path: /sys
        - name: rootfs
          hostPath:
            path: /

```



## Prometheus

### 介绍

#### 特点

> 1、灵活的查询语言（PromQL）,可以对采集的metric指标进行加法、乘法、连接等操作
>
> 2、可以直接在本地部署不用依赖其他分布式存储
>
> 3、可以基于http的pull方式采集时序数据
>
> 4、可以通过服务发现或静态配置发现服务对象
>
> 5、有多种可以可视化的界面如Grafana
>
> 6、可以做高可用，可以对数据进行异地备份，部署多套Prometheus，pushgateway上报数据

#### 组件介绍

> prometheus server: 用于收集和存储时间序列数据
>
> client Library: 客户端库，检测应用程序代码，当 Prometheus 抓取实例的 HTTP 端点时，客户端库会将所有跟踪的 metrics 指标的当前状态发送到 prometheus server 端。
>
> exporter：prometheus 支持多种 exporter，通过 exporter 可以采集 metrics 数据，然后发送到 prometheus server 端，所有向 promtheus server 提供监控数据的程序都可以被称为exporter。
>
> alertmanager：从 Prometheus server 端接收到 alerts 后，会进行去重分组，并路由到相应的接收方，发出报警，常见的接收方式有：电子邮件、微信、钉钉、slack 等
>
> grafana：监控仪表盘，可视化监控数据。
>
> pushgateway：各个目标主机可上报数据到 pushgateway，然后 prometheus server 统一从pushgateway 拉取数据。

#### 工作流程

> Prometheus server 可定期从活跃的（up）目标主机上（target）拉取监控指标数据，目标主机的监控数据可通过配置静态 job 或者服务发现的方式被 prometheus server 采集到，这种方式默认的 pull 方式拉取指标；也可通过 pushgateway 把采集的数据上报到 prometheus server 中；还可通过一些组件自带的 exporter 采集相应组件的数据；
>
> Prometheus server 把采集到的监控指标数据保存到本地磁盘或者数据库；
> Prometheus 采集的监控指标数据按时间序列存储，通过配置报警规则，把触发的报警发送到 alertmanager；
> Alertmanager 通过配置报警接收方，发送报警到邮件，微信或者钉钉等；
> Prometheus 自带的 web ui 界面提供 PromQL 查询语言，可查询监控数据；
> Grafana 可接入 prometheus 数据源，把监控数据以图形化形式展示出。

#### 数据结构

> Counter:
>
> - Counter 用于累计值，例如记录请求次数、任务完成数、错误发生次数。
> - 一直增加，不会减少。
> - 重启进程后，会被重置。
>
> Gauge:
>
> - Gauge 是常规数值，例如温度变化、内存使用变化。
> - 可变大，可变小。
> - 重启进程后，会被重置。
>
> histogram:
>
> - 在一段时间范围内对数据进行采样（通常是请求持续时间或响应大小等），并将其计入可配置的存储桶（bucket）中. 后续可通过指定区间筛选样本，也可以统计样本总数，最后一般将数据展示为直方图。
>
> - 对每个采样点值累计和 (sum)。
> - 对采样点的次数累计和 (count)。
>
> summary:
>
> - 对于每个采样点进行统计，并形成分位图。（如：正态分布一样，统计低于 60 分不及格的同学比例，统计低于 80分 的同学比例，统计低于 95 分的同学比例）；
> - 统计班上所有同学的总成绩 (sum)；
> - 统计班上同学的考试总人数 (count)。



### 安装配置

#### 创建monitor账号，对monitor做rbac授权

```shell
#创建账号
kubectl create serviceaccount monitor -n  monitor
#通过clusterrolebinding绑定到clusterrole上
kubectl create clustertolrbinding monitor-clusterrolebinding -n monitor --clusterrole=cluster-admin --serviceaccount=monitor:monitor
```

#### 创建Prometheus数据存储目录

```shell
# node 1
mkdir /data 
chmod 777 /data/
```

#### 安装Prometheus Server服务

```shell
#创建一个configmap储存卷，用来存放Prometheus配置信息 master 
	vim prometheus-cfg.yaml #yaml文件内容见下方
	#更新configmap资源 master
	kubectl apply -f prometheus-cfg.yaml

#通过deployment部署Prometheus
	#安装Prometheus需要的镜像Prometheus-2-2-1.tar.gz上传到k8s工作节点，手动解压 node
	docker load -i prometheus-2-2-1.tar.gz
	vim prometheus-deploy.yaml	#yaml文件内容见下方 master
	#通过kubectl apply更新Prometheus master
	kubectl apply -f prometheus-deply.yaml
	#查看Prometheus是否部署成功 master
	kubectl get pods -n monitor
 
#给Prometheus pod创建一个service master
	vim prometheus-svc.yaml	#yaml文件内容见下方
	#通过kubectl apply更新service
	kubectl apply -f prometheus-svc.yaml
	#查看service在物理机的端口映射
	kubectl get svc -n monitor
	
#prometheus热加载
	#查看Prometheus的pod ip
	kubectl get pods -n monitor -o wide -l app=prometheus
	#想要配置生效，防问接口
	curl -X POST http://10.244.36.66:9090/-/reload
	#热加载速度比较慢时可以重启Prometheus，如更改了Prometheus-cfg.yaml文件后
	kubectl delete -f prometheus-cfg.yaml prometheus-deploy.yaml
	kubectl apply -f promethus-cfg.yaml prometheus-deploy.yaml
	#生产环境中最好热加载，暴力删除可能导致数据丢失
```

##### prometheus-cfg.yaml

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  labels:
    app: prometheus
  name: prometheus-config
  namespace: monitor
data:
  prometheus.yml:
    global:
      scrape_interval: 15s                # 采集目标主机监控据的时间间隔
      scrape_timeout: 10s                 # 数据采集超时时间，默认 10s
      evaluation_interval: 1m             # 触发告警检测的时间，默认是 1m
    scrape_configs:                       # 配置数据源，称为 target，每个 target 用 job_name 命名。又分为静态配置和服务发现
    - job_name: 'kubernetes-node'         # 使用的是 k8s 的服务发现
      kubernetes_sd_configs:
      - role: node                        # 使用 node 角色，它使用默认的 kubelet 提供的 http 端口来发现集群中每个 node 节点                   
      relabel_configs:                    # 重新标记
      - source_labels: [__address__]      # 配置的原始标签，匹配地址 
        regex: '(.*):10250'               # 匹配带有 10250 端口的 url 
        replacement: '${1}:9100'          # 把匹配到的 ip:10250 的 ip 保留
        target_label: __address__         # 新生成的 url 是 ${1} 获取到的 ip:9100
        action: replace 
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)    # 匹配到下面正则表达式的标签会被保留,如果不做 regex 正则的话，默认只是会显示 instance 标签
    - job_name: 'kubernetes-node-cadvisor'# 抓取 cAdvisor 数据，是获取 kubelet上/metrics/cadvisor 接口数据来获取容器的资源使用情况   
      kubernetes_sd_configs:
      - role:  node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - action: labelmap                  # 把匹配到的标签保留
        regex: __meta_kubernetes_node_label_(.+)    # 保留匹配到的具有__meta_kubernetes_node_label 的标签
      - target_label: __address__         # 获取到的地址：__address__="192.168.78.143:10250"
        replacement: kubernetes.default.svc:443     # 把获取到的地址替换成新的地址kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]# 把原始标签中__meta_kubernetes_node_name 值匹配到
        regex: (.+)
        target_label: __metrics_path__    # 获取 __metrics_path__ 对应的值
        replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor    # 把 metrics 替换成新的值api/v1/nodes/xianchaomaster1/proxy/metrics/cadvisor；${1} 是 __meta_kubernetes_node_name 获取到的值；新的 url 就是 https://kubernetes.default.svc:443/api/v1/nodes/xianchaomaster1/proxy/metrics/cadvisor
    - job_name: 'kubernetes-apiserver'
      kubernetes_sd_configs:
      - role: endpoints                   # 使用 k8s 中的 endpoint 服务发现，采集 apiserver 6443 端口获取到的数据
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]     # endpoint 这个对象的名称空间、服务名、端口名称
        action: keep                      # 采集满足条件的实例，其他实例不采集
        regex: default;kubernetes;https   # 正则匹配到的默认空间下的 service 名字是kubernetes，协议是 https 的 endpoint 类型保留下来
    - job_name: 'kubernetes-service-endpoints'
      kubernetes_sd_configs:
      - role: endpoints
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true                       # 重新打标仅抓取到的具有 "prometheus.io/scrape: true" 的 annotation 的端点，意思是说如果某个 service 具有 prometheus.io/scrape = true annotation 声明则抓取，annotation 本身也是键值结构，所以这里的源标签设置为键，而 regex 设置值true，当值匹配到 regex 设定的内容时则执行 keep 动作也就是保留，其余则丢弃。
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scheme]
        action: replace
        target_label: __scheme__
        regex: (https?)                   # 重新设置 scheme，匹配源标签__meta_kubernetes_service_annotation_prometheus_io_scheme 也就是 prometheus.io/scheme annotation，如果源标签的值匹配到 regex，则把值替换为 __scheme__ 对应的值。
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)                       # 应用中自定义暴露的指标，也许你暴露的 API 接口不是/metrics 这个路径，那么你可以在这个 POD 对应的 service 中做一个 "prometheus.io/path = /mymetrics" 声明，上面的意思就是把你声明的这个路径赋值给 __metrics_path__，其实就是让 prometheus来获取自定义应用暴露的 metrices 的具体路径，不过这里写的要和 service 中做好约定，如果 service 中这样写 prometheus.io/app-metrics-path: '/metrics' 那么你这里就要 __meta_kubernetes_service_annotation_prometheus_io_app_metrics_path 这样写。
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2                # 暴露自定义的应用的端口，就是把地址和你在 service 中定义的 "prometheus.io/port = <port>" 声明做一个拼接，然后赋值给 __address__，这样 prometheus 就能获取自定义应用的端口，然后通过这个端口再结合 __metrics_path__来获取指标，如果 __metrics_path__值不是默认的 /metrics 那么就要使用上面的标签替换来获取真正暴露的具体路径。
      - action: labelmap                  # 保留下面匹配到的标签  
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace                   # 替换 __meta_kubernetes_namespace 变成kubernetes_namespace 
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: kubernetes_name 

```

##### prometheus-deploy.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-server
  namespace: monitor
  labels:
    app: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
      component: server
    #matchExpressions:
    #- {key: app, operator: In, values: [prometheus]}
    #- {key: component, operator: In, values: [server]}
  template:
    metadata:
      labels:
        app: prometheus
        component: server
      annotations:
        prometheus.io/scrape: 'false'
    spec:
      nodeName: k8s-node1
      serviceAccountName: monitor
      containers:
      - name: prometheus
        image: prom/prometheus:v2.2.1
        imagePullPolicy: IfNotPresent
        command:
          - prometheus
          - --config.file=/etc/prometheus/prometheus.yml
          - --storage.tsdb.path=/prometheus                # 旧数据存储目录
          - --storage.tsdb.retention=720h                  # 何时删除旧数据，默认为 15 天
          - --web.enable-lifecycle                         # 开启热加载
        ports:
        - containerPort: 9090
          protocol: TCP
        volumeMounts:
        - mountPath: /etc/prometheus/prometheus.yml
          name: prometheus-config
          subPath: prometheus.yml
        - mountPath: /prometheus/
          name: prometheus-storage-volume
      volumes:
        - name: prometheus-config
          configMap:
            name: prometheus-config
            items:
              - key: prometheus.yml
                path: prometheus.yml
                mode: 0644
        - name: prometheus-storage-volume
          hostPath:
           path: /data
           type: Directory

```

##### prometheus-svc.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitor-sa
  labels:
    app: prometheus
spec:
  type: NodePort
  ports:
    - port: 9090
      targetPort: 9090
      protocol: TCP
  selector:
    app: prometheus
    component: server
```

