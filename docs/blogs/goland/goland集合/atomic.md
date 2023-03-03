## atomic

原子操作主要是两类：修改和加载存储。修改就是在原来的值的基础上改动；加载存储就是读写

atomic提供了AddXXX、CompareAndSwapXXX、SwapXXX、LoadXXX、StoreXXX等方法。

### Add方法

Add方法很好理解，就是对addr指向的值加上delta，如果将delta设置成负值，加法就变成了减法

```go
func AddInt32(addr *int32,delta int32)(new int32)
func AddInt64(addr *int64, delta int64) (new int64)
func AddUint32(addr *uint32, delta uint32) (new uint32)
func AddUint64(addr *uint64, delta uint64) (new uint64)
func AddUintptr(addr *uintptr, delta uintptr) (new uintptr)
```

### CAS方法

```go
func CompareAndSwapInt32(addr *int32, old, new int32) (swapped bool)
func CompareAndSwapInt64(addr *int64, old, new int64) (swapped bool)
func CompareAndSwapPointer(addr *unsafe.Pointer, old, new unsafe.Pointer) (swapped bool)
func CompareAndSwapUint32(addr *uint32, old, new uint32) (swapped bool)
func CompareAndSwapUint64(addr *uint64, old, new uint64) (swapped bool)
func CompareAndSwapUintptr(addr *uintptr, old, new uintptr) (swapped bool)
```

### Swap方法

```go
func SwapInt32(addr *int32, new int32) (old int32)
func SwapInt64(addr *int64, new int64) (old int64)
func SwapPointer(addr *unsafe.Pointer, new unsafe.Pointer) (old unsafe.Pointer)
func SwapUint32(addr *uint32, new uint32) (old uint32)
func SwapUint64(addr *uint64, new uint64) (old uint64)
func SwapUintptr(addr *uintptr, new uintptr) (old uintptr)
```

### Load方法

```go
func LoadInt32(addr *int32) (val int32)
func LoadInt64(addr *int64) (val int64)
func LoadPointer(addr *unsafe.Pointer) (val unsafe.Pointer)
func LoadUint32(addr *uint32) (val uint32)
func LoadUint64(addr *uint64) (val uint64)
func LoadUintptr(addr *uintptr) (val uintptr)
```

### Store方法

```go
func StoreInt32(addr *int32, val int32)
func StoreInt64(addr *int64, val int64)
func StorePointer(addr *unsafe.Pointer, val unsafe.Pointer)
func StoreUint32(addr *uint32, val uint32)
func StoreUint64(addr *uint64, val uint64)
func StoreUintptr(addr *uintptr, val uintptr)
```

### Value类型

```go
type Value struct {
    v interface{}
}
type ifaceWords struct {
	typ  unsafe.Pointer
	data unsafe.Pointer
}
//相比于上面的 StoreXXX 和 LoadXXX，value的操作效率会低一些，不过胜在简单易用。
func (v *Value) Load() (x interface{})
func (v *Value) Store(x interface{})
```

`atomic.Value` 里面其实维护的就是一个interface{},然后提供原子的更新这个interface{}的方法

atomic.Value 一旦第一次Store了一个value，那么后面的Store就必须是同一个类型的value，然后就是在Store之后，Value不能被复制

ifaceWords ，这个其实是对 interface{} 内部结构的表示。我们知道一个interface{}会被编译编译成 eface 结构或则 iface 结构。定义在 runtime/runtime2.go 里面。eface表示一个空接口，iface描述的是非空接口，它包含方法。

```go
type iface struct {
	tab  *itab
	data unsafe.Pointer
}

type eface struct {
	_type *_type
	data  unsafe.Pointer
}
```

不管是 iface 还是 eface 里面保存的都是两个指针对象。所以我们可以把 interface{} 对象的指针转换成`*ifaceWords`，这与后面的Store 和 Load息息相关。

#### Store

```go
func (v *Value) Store(x interface{}) {
	if x == nil {
		panic("sync/atomic: store of nil value into Value")
	}
   // 转换*Value 为 *ifaceWords
   vp := (*ifaceWords)(unsafe.Pointer(v))
   // 转换要存储的value为(*ifaceWords)
   xp := (*ifaceWords)(unsafe.Pointer(&x))
   for {
		// 原子加载atomic.Value里面当前存储的变量类型
		typ := LoadPointer(&vp.typ)
		// type为空，表示第一次加载
		if typ == nil {
			// Attempt to start first store.
			// Disable preemption so that other goroutines can use
			// active spin wait to wait for completion; and so that
			// GC does not see the fake type accidentally.
			// 当前线程禁止抢占，GC也不会看到这个中间态
			runtime_procPin()
			// 设置类型为中间态
			if !CompareAndSwapPointer(&vp.typ, nil, unsafe.Pointer(^uintptr(0))) {
				//已经处于中间态了。
				runtime_procUnpin()
				continue
			}
			// Complete first store.
			StorePointer(&vp.data, xp.data)
			StorePointer(&vp.typ, xp.typ)
			runtime_procUnpin()
			return
		}
		// 正在第一次Store的中间过程中(也就是中间态)
		if uintptr(typ) == ^uintptr(0) {
			// First store in progress. Wait.
			// Since we disable preemption around the first store,
			// we can wait with active spinning.
			continue
		}
		// First store completed. Check type and overwrite data.
		if typ != xp.typ {
			panic("sync/atomic: store of inconsistently typed value into Value")
		}
		StorePointer(&vp.data, xp.data)
		return
	}
}
```

##### 流程

> 1. 先把现有的值和将要写入的值转换成ifaceWord类型，这样我们下一步就可以得到这两个interface{}的原始类型（typ）和真正的值（data）
> 2. 进入 一个无限 for 循环。配合CompareAndSwap食用，可以达到乐观锁的功效
> 3. 通过LoadPointer这个原子操作拿到当前Value中存储的类型，分3种情况处理：
>    - 一个Value实例被初始化后，它的typ字段会被设置为指针的零值 nil，所以先判断如果typ是 nil 那就证明这个Value还未被写入过数据。那之后就是一段初始写入的操作：
>      1. runtime_procPin()，它可以将一个goroutine死死占用当前使用的P(P-M-G中的processor)，不允许其它goroutine/M抢占, 使得它在执行当前逻辑的时候不被打断，以便可以尽快地完成工作，因为别人一直在等待它。另一方面，在禁止抢占期间，GC 线程也无法被启用，这样可以防止 GC 线程看到一个莫名其妙的指向^uintptr(0)的类型（这是赋值过程中的中间状态）。
>      2. 使用CAS操作，先尝试将typ设置为^uintptr(0)这个中间状态。如果失败，则证明已经有别的线程抢先完成了赋值操作，那它就解除抢占锁，然后重新回到 for 循环第一步。
>      3. 如果设置成功，那证明当前线程抢到了这个"乐观锁”，它可以安全的把v设为传入的新值了（19~23行）。注意，这里是先写data字段，然后再写typ字段。因为我们是以typ字段的值作为写入完成与否的判断依据的。
>    - 第一次写入还未完成，如果看到 typ字段还是^uintptr(0)这个中间类型，证明刚刚的第一次写入还没有完成，所以它会继续循环，“忙等"到第一次写入完成。
>    - 第一次写入已完成（第31行及之后） - 首先检查上一次写入的类型与这一次要写入的类型是否一致，如果不一致则抛出异常。反之，则直接把这一次要写入的值写入到data字段。

### Load

```go
func (v *Value) Load() (x interface{}) {
	vp := (*ifaceWords)(unsafe.Pointer(v))
	typ := LoadPointer(&vp.typ)
	if typ == nil || uintptr(typ) == ^uintptr(0) {
		// First store not yet completed.
		return nil
	}
	data := LoadPointer(&vp.data)
	xp := (*ifaceWords)(unsafe.Pointer(&x))
	xp.typ = typ
	xp.data = data
	return
}
```

>如果当前的typ是nil或者^uintptr(0)，那证明第一次写入还没有开始，或者还没有完成，那就直接返回nil（不对外暴露中间状态）
>
>否则，根据当前看到的typ和data构造出一个新的interface{}返回出去