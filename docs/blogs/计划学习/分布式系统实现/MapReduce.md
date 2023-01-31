## MapReduce

### 什么是MapReduce

MapReduce架构的程序能够在大量的普通配置的计算机上实现并行化处理。这个系统在运行时只关心：如何分割输入数据，在大量计算机组成的集群上的调度，集群中计算机的错误处理，管理集群中计算机之间必要的通信。

在输入数据的“逻辑”记录上应用Map操作得出一个中间key/value pair集合，然后在所有具有相同key值的value值上应用Reduce操作，从而达到合并中间的数据，得到一个想要的结果的目的。使用MapReduce模型，再结合用户实现的Map和Reduce函数，我们就可以非常容易的实现大规模并行化计算；通过MapReduce模型自带的“再次执行”（re-execution）功能，也提供了初级的容灾实现方案。

例如，计算一个大的文档集合中每个单词出现的次数，下面是伪代码段：

```python
map(String key,String value):
	for each word w in value:
		EmitIntermediate(w,"1");
reduce(String key,Iterator values):
  	int result = 0;
    for each v in values:
      result += ParseInt(v);
    Emit(AsString(result));
```

Map和Reduce函数相关联的类型:

```python
map(k1,v1) ->list(k2,v2)
reduce(k2,list(v2)) ->list(v2)
```

###  lab1学习与实现

target

实现分布式MapReduce，一个coordinate，一个worker，worker通过rpc和coordinate交互，worker请求任务，进行运算，写出结果到文件，coordinate需要关心worker是否完成任务，在超时的情况下将任务重新分配给其他worker

