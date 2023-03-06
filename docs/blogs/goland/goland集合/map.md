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



### sync.map

Go内建的map是不支持并发写操作的，原因是map写操作不是并发安全的，但超时多个Goroutine操作同一个map时，会产生报错：`fatal error: concurrent map writes`

​		因此官方引入了sync.map来满足并发编程的需求，一般情况下解决并发map的思路就是加一把大锁，或者把一个map分成若干的小map，对key进行hash，只操作相应的小map。前者锁粒度比较大，影响效率，后者实现起来比较复制比较容易出错，而sync.map对map的读写，不需要加锁，并且通过空间换时间的方式，使用read和dirty两个map来进行读写分离，降低锁时间来提高效率。

#### 如何使用

```go
package main
import(
	"fmt"
	"sync"
)
func main(){
    var m sync.map
    //写入
    m.Store("a",18);
    m.Store("b",20);
    //读取
    age,_ := m.Load("a");
    //遍历
    m.Range(func(key,value interface{})bool{
        name := key.(string)
        age := value.(int)
        return true
    })
   	//删除
    m.Delete("a")
   	//读取不存在则写入
    m.LoadOrStore("c",100);
}
```

#### Map数据结构

```go
type Map struct{
    mu Mutex
    read atomic.Value //readOnly
    dirty map[interface{}]*entry
    misses int
}

// readOnly is an immutable struct stored atomically in the Map.read field.
type readOnly struct{
    m map[interface{}]*entry
    // true if the dirty map contains some key not in m
    amended bool	
}

type entry struct{
    // *interface{}
    p unsafe.Pointer
}
```

> - mu：互斥锁，用于保护read和dirty
> - read：只读数据，支持并发读取（atomic.Value类型）。如果涉及到更新操作，则只需要加锁保证数据安全，read实际存储的是readOnly结构体，内存也是一个原生的map，amended属于用于标记read和dirty的数据是否一致
> - dirty：读写数据，是一个原生map，也是非线性安全。操作dirty需要加锁来保证数据安全
> - misses：统计有多少次读取read没有命中，每次read中读取失败后，misses的计数值都会加1
> - 在read和dirty中，都有涉及到entry结构体，其中包含一个指针，用于指向用户存储的元素（key）所指向的value值，read和dirty各自维护一套key，key指向的都是同一个value，也就是说，只要修改了这个entry，对read和dirty都是可见的。

这个entry指针的状态有三种：nil、expunged、正常。

​	当 `p == nil` 时，说明这个键值对已被删除，并且 m.dirty == nil，或 m.dirty[k] 指向该 entry。

​	当 `p == expunged` 时，说明这条键值对已被删除，并且 m.dirty != nil，且 m.dirty 中没有这个 key。

​	p 指向一个正常的值，表示实际 `interface{}` 的地址，并且被记录在 m.read.m[key] 中。如果这时 m.dirty 不为 nil，那么它也被记录在 m.dirty[key] 中。两者实际上指向的是同一个值。



#### 查找过程：

当我们从sync.Map类型中读取数据时，其会先查看read中是否包含所需的元素

- 若有，则通过atomic原子操作读取数据并返回
- 若无，这会判断read.readOnly中的amended属性，它会告诉dirty是否包含read.readOnly.m中没有的数据；若amended为true就会到dirty中查找数据

sync.Map的读性能之所以如此之高的原因就在于存在read这一巧妙的设计，作为一个缓存层，提供了快路劲的查找。同时结合amended属性，解决了每次读取都设计锁的问题，实现读这一个使用场景的高性能。

##### load:

```go
func (m *Map) Load(key interface{}) (value interface{}, ok bool) {
    read, _ := m.read.Load().(readOnly)
    e, ok := read.m[key]
    // 如果没在read中找到,并且amended为true,即dirty中存在read中没有的key
    if !ok && read.amended {
        m.mu.Lock() //dirty map不是线程安全的,所以需要加上互斥锁
        //double check,避免在上锁的过程中dirty map提升为read map。
        read, _ = m.read.Load().(readOnly)
        e, ok = read.m[key]
        //仍然没有在read中找到这个key,并且amended为true
        if !ok && read.amended {
            e, ok = m.dirty[key] //从dirty中找
            //不管dirty中有没有找到,都要"记一笔",因为在dirty提升为read之前,都会进入这条路径
            m.missLocked()
        }
        m.mu.Unlock()
    }
    if !ok { //如果没找到,返回空,false
        return nil, false
    }
    return e.load()
}

func (m *Map) missLocked() {
    m.misses++
    if m.misses < len(m.dirty) {
        return
    }
    // dirty map 晋升
    m.read.Store(readOnly{m: m.dirty})
    m.dirty = nil
    m.misses = 0
}

//entry 的 load 
func (e *entry) load() (value interface{}, ok bool) {
    p := atomic.LoadPointer(&e.p)
    if p == nil || p == expunged {
        return nil, false
    }
    return *(*interface{})(p), true
}
```



#### 写入过程：

即sync.Map的Store方法，该方法的作用是新增或者更新一个元素

##### stroe:

```go
// Store sets the value for a key.
func (m *Map) Store(key, value interface{}) {
    // 如果read map中存在该key则尝试直接更改(由于修改的是entry内部的pointer,因此dirty map也可见)
    read, _ := m.read.Load().(readOnly)
    if e, ok := read.m[key]; ok && e.tryStore(&value) {
        return
   	 }
    m.mu.Lock()
    read, _ = m.read.Load().(readOnly)
    if e, ok := read.m[key]; ok {
        if e.unexpungeLocked() {
            //如果read map中存在该key,但p==expunged,则说明m.dirty!= nil并且m.dirty中不存在该key值，此时:
            //a. 将 p 的状态由 expunged  更改为 nil ; 
            //b. dirty map 插入 key;
            m.dirty[key] = e
        }
        //更新entry.p = value(read map和dirty map指向同一个entry)
        e.storeLocked(&value)
    } else if e, ok := m.dirty[key]; ok {
        //如果read map中不存在该key但dirty map中存在该key,直接写入更新 entry(read map中仍然没有这个key)
        e.storeLocked(&value)
    } else {
        //如果read map和dirty map中都不存在该key,则：
        //a. 如果dirty map为空,则需要创建dirty map,并从read map中拷贝未删除的元素到新创建的dirty map
        //b. 更新amended字段,标识dirty map中存在read map中没有的key
        //c. 将kv写入dirty map中,read不变
        if !read.amended {
            // 到这里就意味着，当前的 key 是第一次被加到 dirty map 中。
            // store 之前先判断一下 dirty map 是否为空，如果为空，就把 read map 浅拷贝一次。
            m.dirtyLocked()
            m.read.Store(readOnly{m: read.m, amended: true})
        }
        // 写入新 key，在 dirty 中存储 value
        m.dirty[key] = newEntry(value)
    }
    m.mu.Unlock()
}

// unexpungeLocked 函数确保了 entry 没有被标记成已被清除
// 如果 entry 先前被清除过了，那么在 mutex 解锁之前，它一定要被加入到 dirty map 中
func (e *entry) unexpungeLocked() (wasExpunged bool) {
    return atomic.CompareAndSwapPointer(&e.p, expunged, nil)
}
```

##### 流程：

> 1. 调用 `Load` 方法检查 `m.read` 中是否存在这个元素。若存在，且没有被标记为删除状态，则尝试存储
> 2. 若该元素不存在或已经被标记为删除状态，直接调用了 `Lock` 方法**上互斥锁**，保证数据安全。
>    - 如果read中存在该key，但已经被标记为已删除(expunged)，则说明 dirty 不等于nil(dirty中肯定不存在该元素)，将元素状态从已删除(expunged)更改为nil,将元素插入dirty中
>    - 若发现read中不存在该元素，但dirty中存在该元素，则直接写入更新entry的指向
>    - 若发现 read 和 dirty 都不存在该元素，则从 read 中复制未被标记删除的数据，并向 dirty 中插入该元素，赋予元素值 entry 的指向

为什么写入性能差，原因：

1. 写入时一定要经过read，多了一层查询，后续还要查询数据情况和状态，性能开销比较大
2. 第三个逻辑处理分支，当初始化或者dirty被提升后，会从read中复制全量的数据，若read中数据量大，则会影响性能



#### 删除过程：

1. 删除依旧得先到read检查元素是否存在，若存在则调用delete标记为expunged（删除状态），非常高效。可以明确read中的元素被删除，性能是非常好的。
2. 若不存在，根据amended的值是否为true，判断read与dirty是否不一致，不一致则需要走dirty流程，上互斥锁。
3. 调用delete方法从dirty中标记该元素被删除

```go
func (e *entry) delete() (value interface{}, ok bool) {
 for {
  p := atomic.LoadPointer(&e.p)
  if p == nil || p == expunged {
   return nil, false
  }
  if atomic.CompareAndSwapPointer(&e.p, p, nil) {
   return *(*interface{})(p), true
  }
 }
}
```

delete方法是将entry.p置为nil,并且标记为expunged（删除状态），而不是真真正正的删除



#### 分段锁实现





