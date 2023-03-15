## map

常见的hash冲突解决方法

>hash查找表用一个hash将key分配到不同的桶bucket，也就是数组不同的index，hash查找表一般会存在碰撞问题，就是说不同的key被hash到同一个bucket，一般有三种方法，链表法、开放地址法和搜索树法，链表法将一个bucket实现成一个链表，落在同一个bucket中的key都会插入这个链表。开放地址法是发生碰撞后，通过一定的规律，在数组后面挑选空位来放置新的key。搜索树是在碰撞节点建立类似avl树、红黑树(java)等

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

### map的底层结构

```go
type hmap struct {
    count int //记录当前map存储的key数量，可以通过builtin包中的len函数返回map的长度
    flags uint8//迭代map或者对map进行写操作的时候，会记录该标志位，用于一些并发场景的检查校验
    B uint8 //len(buckets) == 2^B
    noverflow uint64 //overflow的bucket近似数量
    hash0 uin32//能为hash函数的结果引入随机性
    buckets unsafe.Pointer //指向具体的buckets数组
    oldbuckets unsafe.Pointer //当map扩容时，指向旧的buckets数组
    necacuate uintptr//用于表示扩容搬迁进度
    extras *mapextra //当map的key和value都不是指针，go为了避免GC扫描整个hmap，会将bmap的overflow字段引动到extra
}

type mapextra struct {
    overflow *[]*bmap
    oldoverflow *[]*bmap
    nextOverflow *bmap
}

//buckets即bmap的数组，这是在源码包中的代码
type bmap struct {
    tophash [bucketCnt]uint8
}

//在源码包中的代码会经过反射编译为以下新的结构体
type bmap struct {
    tophash [8]uint8 //存储哈希值的高8位
    keys [8]keytype
    values [8]valuetype
    pad uintptr
    overflow uintptr //溢出bucket的地址
}



```



![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f281ea45dfc4969a3ebba2239abb2ed~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)

go的map中它的底层是hmap，hmap中维护着若干个bucket数组，bucket数组中每个元素都是bmap结构。

![map整体结构](https://kevinwu0904-blog-images.oss-cn-shanghai.aliyuncs.com/blogs-golang-map/20210719113331.png)

bmap可最多防止8个kv,为了空间利用率key和value分别存放，操作桶大小的部分会创建新的桶并通过overflow串联起来，顶层的tophash存放着每个key hash值的高8位，用于插入时的快速比较

### map的创建

```go
package main
import "fmt"
func main() {
	m1 := make(map[int]int) 
	m2 := make(map[int]int, 10) // 创建map支持传递一个参数，表示初始大小
	fmt.Println(m1, m2)
}
```

#### map底层创建有三种实现：

1. `makemap_small`:当map编译期确定初始化长度不大于bucketCnt(即8)，只创建hmap，不初始化buckets
2. `makemap64`:当make函数传递的长度参数类型是int64的时候，调用该函数底层仍然是复用`makemap`,实则就是将int64转为int
3. `makemap`:初始化hash0加入随机性，计算对数B，并初始化buckets



### map的访问

即通过给定的key在map中寻找对应的value，大致步骤如下：

1. 以64位操作系统为例，原始的key通过Hash函数映射成64位二进制
2. 低B位对应bmap的位置，从[]bmap中找到对应的bmap
3. 高8位对应改key的tophash，从步骤二所对应的bmap开始检索，首先会比较bmap顶层的tophash与原始key的tophash是否相同，若不同则直接跳过比较下一个；若相同则进行下一步比较key是否相同。
4. 若当前的bmap中比较完，没有匹配到目标key，且overflow不为空，则继续从overflow指向的下一bmap中继续比较

### GET拿取数据

假设当前B=4，即桶的数量为2^B=16个，要从map中获取key对应的value,有以下几个步骤：

map汇编后看出map的访问对应到底层代码主要是`runtime.mapaccess1`和`runtime.mapaccess2`两个方法，mapraccess2相比mapraccess1多了一个bool返回值，表示该key是否存在，其他逻辑基本一致。

```go
func mapaccess1(t *maptype,h *hmap,key unsafe.Pointer)unsafe.Pointer{
    if raceenabled && h != nil {
		callerpc := getcallerpc()
		pc := funcPC(mapaccess1)
		racereadpc(unsafe.Pointer(h), callerpc, pc)
		raceReadObjectPC(t.key, key, callerpc, pc)
	}
	if msanenabled && h != nil {
		msanread(key, t.key.size)
	}
	if h == nil || h.count == 0 {
		if t.hashMightPanic() {
			t.hasher(key, 0) // see issue 23734
		}
		return unsafe.Pointer(&zeroVal[0])
	}
	// map不允许并发读写，会触发该panic。这里是通过flags的标记位来判断是否正在进行写操作。
	if h.flags&hashWriting != 0 {
		throw("concurrent map read and map write")
	}
	hash := t.hasher(key, uintptr(h.hash0))
	m := bucketMask(h.B) // m即后B位，用于定位[]bmap中对应的bmap。
	b := (*bmap)(add(h.buckets, (hash&m)*uintptr(t.bucketsize))) // 定位到具体的bmap。
	if c := h.oldbuckets; c != nil {
		if !h.sameSizeGrow() {
			// There used to be half as many buckets; mask down one more power of two.
			m >>= 1
		}
		oldb := (*bmap)(add(c, (hash&m)*uintptr(t.bucketsize)))
		if !evacuated(oldb) {
			b = oldb
		}
	}
	top := tophash(hash) // tophash即首8位，用于快速比较。
bucketloop:
	// 遍历迭代bmap和它的overflow bmap。
	for ; b != nil; b = b.overflow(t) {
		for i := uintptr(0); i < bucketCnt; i++ {
			// 首先比较tophash是否相同，不相同会直接continue。
			if b.tophash[i] != top { 
				if b.tophash[i] == emptyRest {
					break bucketloop
				}
				continue
			}
			k := add(unsafe.Pointer(b), dataOffset+i*uintptr(t.keysize))
			if t.indirectkey() {
				k = *((*unsafe.Pointer)(k))
			}
			// tophash相同的情况下，会比较key的值是否相同。若相同，则说明已经定位到该key，返回结果。
			if t.key.equal(key, k) {
				e := add(unsafe.Pointer(b), dataOffset+bucketCnt*uintptr(t.keysize)+i*uintptr(t.elemsize))
				if t.indirectelem() {
					e = *((*unsafe.Pointer)(e))
				}
				return e
			}
		}
	}
	return unsafe.Pointer(&zeroVal[0])
}
```

如果key是string，int32/uint32，int64/uint64在go中会被汇编成不同的函数，大致逻辑与mapaccess1逻辑一致，只是对key进行处理的部分不一样

```go
func mapaccess1_fast32(t *maptype, h *hmap, key uint32) unsafe.Pointer
func mapaccess2_fast32(t *maptype, h *hmap, key uint32) (unsafe.Pointer, bool)
func mapaccess1_fast64(t *maptype, h *hmap, key uint64) unsafe.Pointer
func mapaccess2_fast64(t *maptype, h *hmap, key uint64) (unsafe.Pointer, bool)
func mapaccess1_faststr(t *maptype, h *hmap, ky string) unsafe.Pointer
func mapaccess2_faststr(t *maptype, h *hmap, ky string) (unsafe.Pointer, bool)
```



### map的赋值

`在不考虑扩容的情况下，map的赋值和map的访问逻辑基本一致，首先遵循map访问的方式通过后B位确定bmap,通过前8位确定tophash。当map中不存在该key，会记录bmap中第一个空闲的tophash，并插入该key，但map中存在该key，则更新该key的value`

通过汇编后的代码调用可以看出map赋值对应的底层实现对应`runtime.mapassign`



### map的扩容

map扩容的目的在于减少Hash冲突，防止算法复杂度退化，保持hash算法O(1)的时间复杂度

map的扩容是渐进式的，即整个扩容过程拆散在每一次写操作里面，这样做的好处就是保证每一个map的读写操作时间复杂度都是稳定的。

#### 触发扩容的时机有两个：

1. map的负载因子（长度与容量的比例）超过阈值（6.5），此时map认为无法承担更多的key，需要两倍扩容。

2. 溢出桶的数量过多

   当B < 15时，如果overflow的bucket数量超过了2^B

   当B > 15时，如果overflow的bucket数量超过了2^15

   map存在局部bmap含有过多的overflow的情况，此时map会认为局部bmap可以进行tophash密集排序，让overflow的数量更少，这种扩容实际上是一种整理，把后置位的数据整理到前面，这种情况下元素会发生重排但是不会换桶，即相同容量扩容

#### 扩容的细节

1. hmap结构中有一个oldbuckets，扩容刚发生时，先将老数据存到这个里面
2. 每次对map进行增删改查的时候，会触发从oldbucket中迁移到bucket的操作，非一次性，分为多次
3. 在扩容没有完全迁移完成之前，每次get或者put遍历数据时，都会先遍历oldbuckets然后再遍历buckets



### map的删除

map的删除与访问基本逻辑一致，遍历bmap与overflow寻找目标key，如果可以找到则清空tophash并删除key/value释放内存。



### map的迭代

由于map存在渐进式扩容，因此map的迭代并不像想象中的那么直接，而需要考虑搬迁过程中的迭代，map在搬迁过程中会通过nevacuate来记录搬迁进度，因此在迭代过程中需要同时考虑遍历旧的bmap和新的bmap

从编译结果中，我们可以看出map的迭代底层对应的是`runtime.mapiterinit`和`runtime.mapiternext`：

```go
func mapiterinit(t *maptype, h *hmap, it *hiter) {
	if raceenabled && h != nil {
		callerpc := getcallerpc()
		racereadpc(unsafe.Pointer(h), callerpc, funcPC(mapiterinit))
	}
	if h == nil || h.count == 0 {
		return
	}
	if unsafe.Sizeof(hiter{})/sys.PtrSize != 12 {
		throw("hash_iter size incorrect") // see cmd/compile/internal/gc/reflect.go
	}
	it.t = t
	it.h = h
	// grab snapshot of bucket state
	it.B = h.B
	it.buckets = h.buckets
	if t.bucket.ptrdata == 0 {
		h.createOverflow()
		it.overflow = h.extra.overflow
		it.oldoverflow = h.extra.oldoverflow
	}
	// decide where to start
	// 可以看出，map的迭代器会随机选择一个开始的bucket位置和开始的offset。
	r := uintptr(fastrand())
	if h.B > 31-bucketCntBits {
		r += uintptr(fastrand()) << 31
	}
	it.startBucket = r & bucketMask(h.B)
	it.offset = uint8(r >> h.B & (bucketCnt - 1))
	// iterator state
	it.bucket = it.startBucket // 记录随机的开始位置。
	if old := h.flags; old&(iterator|oldIterator) != iterator|oldIterator {
		atomic.Or8(&h.flags, iterator|oldIterator)
	}
	mapiternext(it)
}
```

```go
func mapiternext(it *hiter) {
	h := it.h
	if raceenabled {
		callerpc := getcallerpc()
		racereadpc(unsafe.Pointer(h), callerpc, funcPC(mapiternext))
	}
	if h.flags&hashWriting != 0 {
		throw("concurrent map iteration and map write")
	}
	t := it.t
	bucket := it.bucket
	b := it.bptr
	i := it.i
	checkBucket := it.checkBucket
next:
	if b == nil {
		if bucket == it.startBucket && it.wrapped {
			it.key = nil
			it.elem = nil
			return
		}
		// 判断是否正处于扩容搬迁中,对于正在搬迁过程中仍未完成搬迁的bucket,迭代过程中需要考虑进入旧的bucket里面
		if h.growing() && it.B == h.B {
			oldbucket := bucket & it.h.oldbucketmask()
			b = (*bmap)(add(h.oldbuckets, oldbucket*uintptr(t.bucketsize)))
			if !evacuated(b) {
				checkBucket = bucket
			} else {
				b = (*bmap)(add(it.buckets, bucket*uintptr(t.bucketsize)))
				checkBucket = noCheck
			}
		} else {
			b = (*bmap)(add(it.buckets, bucket*uintptr(t.bucketsize)))
			checkBucket = noCheck
		}
		bucket++
		if bucket == bucketShift(it.B) {
			bucket = 0
			it.wrapped = true
		}
		i = 0
	}
	for ; i < bucketCnt; i++ {
		offi := (i + it.offset) & (bucketCnt - 1)
		if isEmpty(b.tophash[offi]) || b.tophash[offi] == evacuatedEmpty {
			continue
		}
		k := add(unsafe.Pointer(b), dataOffset+uintptr(offi)*uintptr(t.keysize))
		if t.indirectkey() {
			k = *((*unsafe.Pointer)(k))
		}
		e := add(unsafe.Pointer(b), dataOffset+bucketCnt*uintptr(t.keysize)+uintptr(offi)*uintptr(t.elemsize))
		if checkBucket != noCheck && !h.sameSizeGrow() {
			if t.reflexivekey() || t.key.equal(k, k) {
				hash := t.hasher(k, uintptr(h.hash0))
				if hash&bucketMask(it.B) != checkBucket {
					continue
				}
			} else {
				if checkBucket>>(it.B-1) != uintptr(b.tophash[offi]&1) {
					continue
				}
			}
		}
		if (b.tophash[offi] != evacuatedX && b.tophash[offi] != evacuatedY) ||
			!(t.reflexivekey() || t.key.equal(k, k)) {
			it.key = k
			if t.indirectelem() {
				e = *((*unsafe.Pointer)(e))
			}
			it.elem = e
		} else {
			rk, re := mapaccessK(t, h, k)
			if rk == nil {
				continue // key has been deleted
			}
			it.key = rk
			it.elem = re
		}
		it.bucket = bucket
		if it.bptr != b { // avoid unnecessary write barrier; see issue 14921
			it.bptr = b
		}
		it.i = i + 1
		it.checkBucket = checkBucket
		return
	}
	b = b.overflow(t)
	i = 0
	goto next
}
```

map的迭代顺序完全是随机的，并且map在迭代过程中会根据搬迁进度来判断是否要兼顾旧的bucket



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



## sync.map

Go内建的map是不支持并发写操作的，原因是map写操作不是并发安全的，但超时多个Goroutine操作同一个map时，会产生报错：`fatal error: concurrent map writes`

​		因此官方引入了sync.map来满足并发编程的需求，一般情况下解决并发map的思路就是加一把大锁，或者把一个map分成若干的小map，对key进行hash，只操作相应的小map。前者锁粒度比较大，影响效率，后者实现起来比较复制比较容易出错，而sync.map对map的读写，不需要加锁，并且通过空间换时间的方式，使用read和dirty两个map来进行读写分离，降低锁时间来提高效率。

### 如何使用

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

### Map数据结构

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



### 查找过程：

当我们从sync.Map类型中读取数据时，其会先查看read中是否包含所需的元素

- 若有，则通过atomic原子操作读取数据并返回
- 若无，这会判断read.readOnly中的amended属性，它会告诉dirty是否包含read.readOnly.m中没有的数据；若amended为true就会到dirty中查找数据

sync.Map的读性能之所以如此之高的原因就在于存在read这一巧妙的设计，作为一个缓存层，提供了快路劲的查找。同时结合amended属性，解决了每次读取都设计锁的问题，实现读这一个使用场景的高性能。

#### load:

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



### 写入过程：

即sync.Map的Store方法，该方法的作用是新增或者更新一个元素

#### stroe:

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

#### 流程：

> 1. 调用 `Load` 方法检查 `m.read` 中是否存在这个元素。若存在，且没有被标记为删除状态，则尝试存储
> 2. 若该元素不存在或已经被标记为删除状态，直接调用了 `Lock` 方法**上互斥锁**，保证数据安全。
>    - 如果read中存在该key，但已经被标记为已删除(expunged)，则说明 dirty 不等于nil(dirty中肯定不存在该元素)，将元素状态从已删除(expunged)更改为nil,将元素插入dirty中
>    - 若发现read中不存在该元素，但dirty中存在该元素，则直接写入更新entry的指向
>    - 若发现 read 和 dirty 都不存在该元素，则从 read 中复制未被标记删除的数据，并向 dirty 中插入该元素，赋予元素值 entry 的指向

为什么写入性能差，原因：

1. 写入时一定要经过read，多了一层查询，后续还要查询数据情况和状态，性能开销比较大
2. 第三个逻辑处理分支，当初始化或者dirty被提升后，会从read中复制全量的数据，若read中数据量大，则会影响性能



### 删除过程：

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



### 分段锁实现






## map实现set

```go
type Set struct{
    map map[string]struct{}
    lock sync.Mutex
}


func (set *Set)add(key string) bool{
    set.lock.Lock()
    if _,ok := set.map[key];ok{//存在
        return false
    }else{//不存在
        set.map[key] = struct{}
    }
    defer set.lock.unLock()
}


func (set *Set)isHas()bool{
    if _,ok := set.map[key];!ok{
        return false
    }
    return true
}

func (set *Set)del(key string)bool{
    if _,ok := set.map[key];!ok{
        return false
    }else{
        delete(set.map[key],key)
        return true
    }
}

```



∑