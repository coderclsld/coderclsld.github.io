## Tidb

> pingcap开源的分布式数据库，支持OLTP和OLAP，即兼顾传统关系型数据库mysql的频繁增删改查和事务处理，也兼顾类似Hive、clickhouse实时大IO查询的分析操作

### 一、tidb安装

[tidb单节点安装操作](https://dev-tang.com/post/2018/03/tidb-install-and-use.html)

### 二、tidb结构

tidb集群主要分以下三个组件

#### tidb server：

负责接收SQL请求，处理SQL相关逻辑，并通过pd找到存储计算所需要的tikv地址，与tikv交互获取数据，最终返回结果。

#### pd server：

是整个集群的管理模块，其主要工作有三个，一是存储集群的元信息（某个key存储在哪个tikv节点）；二是对tikv集群进行调度和负载均衡（如数据迁移、raft）；三是分配全局唯一且递增的事务ID

#### tikv server：

复制存储数据，从外部看tikv是一个分布式的提供事务的key-value存储引擎，存储数据的基本单位是Region，每个region负责存储一个key range（从stratKey到endKey的左闭右开区间）的数据，每个tikv阶段会负责多个region。tikv使用raft协议作复制，保持数据的一致性和容灾。不同节点上的多个Regina构成一个raft group，数据在多个tikv之间负载均衡由pd调度，是以Regina为单位进行调度

[tidb原理解析](https://blog.csdn.net/lianshaohua/article/details/105029321#:~:text=TiDB%20%E7%9A%84%20%E5%8E%9F%E7%90%86%20%E4%B8%8E%E5%AE%9E%E7%8E%B0%20TiDB%20%E6%9E%B6%E6%9E%84%E6%98%AF%20SQL%20%E5%B1%82%E5%92%8C,MySQL%20%E7%9A%84%E5%85%B3%E7%B3%BB%E3%80%82%20%E6%9C%89%E4%BA%86%20TiKV%EF%BC%8C%20TiDB%20%E5%B1%82%E5%8F%AA%E9%9C%80%E8%A6%81%E5%AE%9E%E7%8E%B0%20SQL%20%E5%B1%82%EF%BC%8C)

### 三、tidb源码阅读

tidbserver源码

[pingcap tidb源码阅读]([TiDB源码阅读笔记（一） TiDB的入口 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/163607256))

tikv源码

[tikv源码三部曲]([TiKV 源码阅读三部曲（一）重要模块 - TiDB 社区技术月刊 | TiDB Books](https://tidb.net/book/tidb-monthly/2022/2022-10/feature-indepth/tikv-code-one#:~:text=总体来看，TiKV 是一个通过 Multi-Raft 实现的分布式 KV 数据库。 TiKV 的每个进程拥有一个,region 是一个 raft 组，会存在于副本数个 store 上管理一段 KV 区间的数据。))



### 四、mysql到tidb的迁移

三种方案

双写方案：同时往MySQL和tidb写入数据，两个数据库数据完全保持同步



读写分离：数据写入MySQL，从tidb读，具体方案是切换到线上有，保持读写分离一周左右，这一周的时间来确定tidb有没有问题，在把写操作也切到tidb

