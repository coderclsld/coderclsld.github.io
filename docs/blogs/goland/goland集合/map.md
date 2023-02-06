## map

### map相关的数据结构

map由hash table和搜索树组成，来维护一个集合的数据

hash查找表用一个hash将key分配到不同的桶bucket，也就是数组不同的index，hash查找表一般会存在碰撞问题，就是说不同的key被hash到同一个bucket，一般有三种方法，链表法、开放地址法和搜索树法，链表法将一个bucket实现成一个链表，落在同一个bucket中的key都会插入这个链表。开放地址法是发生碰撞后，通过一定的规律，在数组后面挑选空位来放置新的key。搜索树是在碰撞节点建立类似avl树、红黑树(java)等

```go
type hmap struct {
    count int //元素个数
    B uint8 //buckets，数组长度就是2^B个
    overflow uint64 //溢出桶的数量
    buckets unsafe.Pointer //2^B个桶对应的数组指针
    oldbuckets unsafe.Pointer //发生扩容时，记录扩容前的buckets数组指针
    extras *mapextra //用于保存溢出桶的地址
}

type mapextra struct {
    overflow *[]*bmap
    oldoverflow *[]*bmap
    nextOverflow *bmap
}

type bmap struct {
    tophash [bucketCnt]uint8
}

//编译器会产生新的结构体
type bmap struct {
    tophash [8]uint8 //存储哈希值的高8位
    data byte[1] //key value
    overflow *bmap //溢出bucket的地址
}
```



![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f281ea45dfc4969a3ebba2239abb2ed~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)

go的map中它的底层是hmap，hmap中维护着若干个bucket数组，bucket数组中每个元素都是bmap结构。

### GET拿取数据

假设当前B=4，即桶的数量为2^B=16个，要从map中获取key对应的value,有以下几个步骤：

1. 计算key的hash值，当前主流计算机都是64位，所以计算结果有64个比特位
2. 通过最后的**B**位来确定在哪号桶
3. 根据key对应的hash值**前8位**快速确定是在这个桶的哪个位置
4. 对比key完整的hash是否匹配
5. 如果都没有找到，就去连接的下一个溢出桶中找



### PUT存放数据

1. 通过key的hash值后“B”位确定是哪一个桶
2. 历当前桶，通过key的tophash和hash值，防止key重复，然后找到第一个可以插入的位置，即空位置处存储数据
3. 如果当前桶元素已满，会通过overflow链接创建一个新的桶，来存储数据

关于hash冲突：当两个不同的key落在同一个桶中，就是发生了hash冲突，冲突采用的解决方法是从前往后找到第一个空位进行插入，如果8个kv满了，那么当前桶就会连接到下一个溢出桶。



### 扩容

- 相同容量扩容

  由于map不断的put和delete key，桶中可能会出现很多断断续续的空位，这些空位会导致连接的bmap溢出桶很长，导致扫描时间过长。这种扩容实际上是一种整理，把后置位的数据整理到前面，这种情况下元素会发生重排但是不会换桶。

- 2倍容量扩容

  2倍扩容是由当前桶数组确实不够用了，发生这种扩容时，元素会重排，会发生桶迁移，在扩容前由hash值的后几位来决定几号桶，在扩容发生后，由hash值后的几位加上1位来决定几号桶。

  

### 扩容条件

1. 转载因子 > 6.5

   转载因子是指当前map中，每个桶中的平均元素个数，正常情况下一个桶中最多有8个元素，当平均每个桶中的数据超过了6.5个，那就以为着容量不足了需要扩容了

2. 溢出桶的数量过多

   当B < 15时，如果overflow的bucket数量超过了2^B

   当B > 15时，如果overflow的bucket数量超过了2^15

   简单来讲，新加入key的hash值后8位都是一样的，使得个别桶一直在插入新数据，进而导致它的溢出桶链条越来越长，如此一来当map在操作数据时，扫描速度就会变得很慢，及时的扩容，可以对这些数据元素进行重排，是得元素在桶的位置更加平均一些

   

### 扩容的细节

1. hmap结构中有一个oldbuckets，扩容刚发生时，先将老数据存到这个里面
2. 每次对map进行增删改查的时候，会触发从oldbucket中迁移到bucket的操作，非一次性，分为多次
3. 在扩容没有完全迁移完成之前，每次get或者put遍历数据时，都会先遍历oldbuckets然后再遍历buckets



### 注意事项

1. 对map数据进行操作时不可取地址，因为map会随着元素数量的增长而重新分配更大的内存空间，会导致之前拿到的地址改变，导致地址无效

2. map时线程不安全的，在工作中当我们涉及一个map进行并发读写时，一般采用的做法是采用goland中自带的mutex

   ```go
   type Resource struct{
       sync.RWMutex
       m map[string]int
   }
   func main{
       r := Resource{m : make(map[string]int)}
       go func(){
           for j:=0;j < 100;j++{
               r.Lock()
               r.m[fmt.Sprintf("resource_%d"，j)] = j
               r.Unlock()
           }
       }()
       go func(){
           for j := 0;j < 100;j++{
               r.RLock()
               fmt.Println(r.m[fmt.Sprintf("resource_%d",j)])
               r.RUnlock()
           }
       }()
   }
   ```



### map的用法

```go
package main
import "fmt"
func main(){
  //通过:= 创建
  m1 := map[string]string{"name":"陈霖","age":"24",}
  //遍历
  for k,v := range m1{fmt.Println(k,v)}
  //测试kv是否存在，存在ok=true,否则ok=false
  if name,ok := m1 m1["name"];ok{  }
  //通过make创建
  m2 := make(map[string]string)
  m2["city"] = "shantou"
  //修改
  m2["city"] = "gaungzhou"
  //删除
  delete(m2,"city")
  //注意 var创建的是一个为空指针的map，无法操作
  var m3 map[string]int
}
```

