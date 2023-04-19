## interface原理

### interface底层结构
根据interface是否包含method，底层实现上用两种struct来表示：`runtime.iface`和`runtime.eface`。eface表示不含method的interface结构即empty interface。iface表示包含方法的接口。
interface不是单纯的值，而是分为值和类型，必须得类型和值同时都为nil的情况下，interface的nil判断才会为true。
```go
type eface struct{
    _type *_type//类型信息，_type是Go语言中所有类型的公共描述，所有数据结构都可以抽象成_type
    data unsafe.Pointer//指向具体实际数据的指针
}

type iface struct{
    tab *itab//包含interface的一些关键信息，如method的具体实现
    data unsafe.Pointer
}

type _type struct {  
 size       uintptr // type size 类型大小
 ptrdata    uintptr // size of memory prefix holding all pointers  前缀持有所有指针的内存大小
 hash       uint32  // hash of type; avoids computation in hash tables  数据hash值
 tflag      tflag   // extra type information flags  
 align      uint8   // alignment of variable with this type  
 fieldalign uint8   // alignment of struct field with this type  
 kind       uint8   // enumeration for C  
 alg        *typeAlg  // algorithm table  函数指针
 gcdata    *byte    // garbage collection data  
 str       nameOff  // string form  
 ptrToThis typeOff  // type for pointer to this type, may be zero  
}  

type itab struct{
    inter *interfacetype //接口自身
    _type *_type //具体类型
    link *itab 
    hash uint32
    bad bool
    inhash bool
    unused [2]byte
    fun [1]uintptr //函数指针，指向具体类型所实现的方法
}

type interfacetype struct{
    typ _type
    pkgpath name
    mhdr []imethod
}
```
一般来说interface判断即 `io.Wtite != nil`判断是值判断了类型值是否为nil,并没有判断其动态值是否为nil
```go
package main
import ("fmt")
func main(){
    var a interface{} = nil//tab = nil,data = nil
    var b interface{} = (*int)(nil) //tab 包括*int类型的信息，data = nil
    fmt.Println(a == nil) //true
    fmt.Println(b == nil) //false
}
```
可以借助反射来判断
```go
func IsNil(i interface{}) bool{
    defer func(){
        recover()
    }()
    vi := reflect.ValueOf(i)
    return vi.IsNil()
}
```

~~0、先把简历改一下~~
~~1、interface底层原理~~
2、刷一下golang的算法题
3、kubernetes集群搭建一下
4、回顾一下四个面试视频，提取关键信息
~~5、重要的事情，两点要投递简历~~
6、一些问题和回答准备
7、raft算法