## goland基础

### 高效字符串拼接

a)原始拼接方式（+=），原生拼接使用+操作符直接对两个字符串进行拼接

```go
var s string
s += "hello"
```

这种方式是不高效的，因为在go中string是不可变的，其拼接先得将s的值取下来（从头遍历复制），然后与一个字符串进拼接，计算好后在将新值重新赋值给s，而s的旧值就会等待垃圾回收器回收。时间复杂度为O(N^2)

b)`bytes.Buffer`，`bytes.Buffer`是一个可变长的字节缓冲区，器内部使用slice存储字节(`buf []byte`)

```go
buf := bytes.NewBufferString("hello")
buf.WriteString("world")
```

使用`WriteString`进行字符串拼接是，其会根据情况动态扩展slice的长度，并使用内置slice内存拷贝函数将待拼接拷贝字符串拷贝到缓冲区中，每次拼接的时候无需重新拷贝旧有的部分，仅需将待拼接的部分追加到尾部即可。时间复杂度为O(N)

c)`strings.Builder`,`strings.builder`内部也是使用slice来存储的

使用`WriteString`进行字符串拼接时，会调用器内置append函数将待拼接字符串并入缓存区slice中

 ```go
 func (b *Builder)WriteString(s string)(int,error){
     b.copyCheck()
     b.buf = append(b.buf,s...)
     return len(s),nil
 }
 ```

d)内置copy函数

内置copy函数支持将一个源slice拷贝到一个目标slice，因字符串的底层表示就是[]byte，所以也可以使用该函数进行字符串拼接，不过限制是需要预先知道字符slice的长度。

```go
bytes := make([]byte,11)
size := copy(bytes[0:],"hello")
copy(bytes[size:],"world")
fmt.Println(string(byte))
```

每次拼接时，其亦只需将待拼接字符串追加到slice尾部，效率亦很高。

e)`strings.Join`,若想将一个string slice（`[]string`）的各部分拼成一个字符串，可以使用`strings.Join`进行操作。

```go
s := strings.Join([]string{"hello world"}, "")
```

其内部也是使用`bytes.Builder`进行实现的

```go
func Join(elems []string, sep string)string{
    ...
    var b Builder
    b.Grow(n)
    b.WrirteString(elems[0])
    for _,s := range elems[1:]{
        b.WriteStirng(sep)
        b.WriteString(s)
    }
    return b.String()
}
```

### Go比较两个字符串切片是否相等

`DeepEqual`

官方的reflect包中有个`DeepEqua`l方法，可以用来判断任意x和y是否相等，相同类型的两个值可能相等，不同类型的两个值永远不会相等，但是通常不会推荐这么做，因为反射非常影响性能，通常采用遍历比较切片中每一个元素的方式（注意数组越界问题）

```go
func StringSliceEqualBCE(a,b []string)bool{
    if len(a) != len(b){
        return false
    }
    if (a == nil ) != (n == nil){
        return false
    }
    b = b[:len(a)]
    for i,v := range a{
        if v != b[i]{
            return false
        }
    }
    return ture
}
```

### go格式化打印

通用

```
%v  值得默认格式表示
%+v 类似%v，但是输出结构体时会添加字段名
%#v 值得go语法表示
%T  值得类型的go语法表示
%%  百分号
```

布尔类型

```
%t  true或false表示
```

整数

```
%b  表示二进制
%c  该值对应的unicode码值
%d  表示为十进制
%o  表示为八进制
%q  该值对应的单引号扩起来的go语法字符串面值必要时会采用安全的转义表示
%x  表示为十六进制,使用a-f
%X  表示为十六进制，使用A-F
%U  表示使用Unicode格式:U+1234，等价于"U+%04X"
```

浮点数与复数

```
%b   无小数部分、二进制指数科学计数法
%e   科学计数法，如-1234.456e+78
%E   科学计数法，如-1234.456E+78
%f   有小数部分但无指数部分，如123.456，默认宽度，默认精度
%9f  宽度为9,默认精度
%.2f 默认宽度，精度2
%9.2f宽度9，精度2
%9.f 宽度9，精度0
%F   等价于%f
%g   根据实际情况采用%e或%f格式
%G   根据实际情况采用%E或%F格式
```

字符串和[]byte

```
%s  直接输出字符串或者[]byte
%q  该值对应的双括号括起来的go语法字符串字面值，必要时会采用安全转义表示
%x  每个字节用两字符串十六进制表示(使用a-f)
%X  每个字节用两字符串十六进制表示(使用A-F)
```

指针

```
%p  表示十六进制，并加上前缀0x
```

#### go struct比较

##### 同一个struct的两个实例能不能比较

```go
type S struct{
    Name string
    Age int
    Adress *int
}
func main(){
    a := S{
        Name:"aa",
        Age:1,
        Address:new(int),
    }
    b := S{
        Name:"aa",
        Age:1,
        Address: new(int),
    }
    fmt.Println(a == b)
}

//输出为false

```

golang中 *Slice*，*Map*，*Function* 这三种数据类型是不可以直接比较的。我们再看看S结构体，该结构体并没有包含不可比较的成员变量，所以该结构体是可以直接比较的。

a 和 b 虽然是同一个struct 的两个实例，但是因为其中的指针变量 Address 的值不同，所以 a != b，如果a b 在初始化时把 Address 去掉（不给 Address 初始化），那么这时 a == b 为true, 因为ptr变量默认值是nil，又或者给 Address 成员变量赋上同一个指针变量的值，也是成立的。

如果给结构体S增加一个slice类型的成员变量（即不能比较的成员变量）

```go
type S struct{
    Name string
    Age int
    Address *int
    Data []int
}
func main{
    a := S{
        Name:"aa",
        Age:1,
        Address:new(int),
        Data:[]int{1,2,3},
    }
    b := S{
        Name:"aa",
        Age:1,
        Address:new(int),
        Data:[]int{1,2,3},
    }
    fmt.Println(a == b)
}
```

这时候会打印输出报错：`invalid operation: a == b (struct containing []int cannot be compared)`

但在平时的开发中我们需要对含有不可直接比较的数据类型的结构体实力进行比较时，是不是就没法比较了呢？事实上并非如此，我们可以借助`reflect.DeepEqual`函数来对两个变量进行比较。

```go
type S struct{
    Name string
    Age int
    Address *int
    Data []int
}
func main{
    a := S{
        Name: "aa",
        Age:1,
        Address:new(int),
        Data:[]int{1,2,3}
    }
    b := S{
        Name:"bb",
        Age:1,
        Address:new(int),
        Data:[]int{1,2,3},
    }
    fmt.Println(reflect.DeepEqual(a,b))
}
//打印输出:true
```

使用DeepEqual函数判断两个值是否深度一致。具体比较规则如下：

> - 不同类型的值永远不会深度相等
> - 当了数组的元素对应深度相等时，两个数组深度相等
> - 当两个相同结构体的所有字段对应深度相等的时候，两个结构体深度相等
> - 当两个函数都为nil时，两个函数深度相等，其他情况不相等
> - 但两个interface的真实值深度相等时，两个interface深度相等
> - map的比较需要同时满足一下几个
>   - 两个map都为nil或者都不为nil，并且长度要相等
>   - 相同的map对象或者所有key要对应相同
>   - map对应的value也要深度相等
> - 指针，满足以下一项即是深度相等
>   - 两个指针满足go的==操作符
>   - 两个指针指向的值是深度相等的
> - 切片，需要同时满足以下几点才是深度相等
>   - 两个切片都是nil或者都不为nil，并且长度相等
>   - 两个切片底层数据指向的第一个位置要相同或者底层的元素要深度相等
>   - 注意：空的切片跟nil切片是不深度相等的
> - 其他类型的值（numbers，bools，strings，channel）如果满足go == 操作符则深度相等

##### 两个不同的struct的实例能不能比较

可以通过强制转换来比较：

```go
type T2 struct{
    Name string
    Age int
    Arr [2]bool
    ptr *int
}
type T3 struct{
    Name string
    Age int
    Arr [2]bool
    ptr *int
}
func main{
    var ss1 T2
    var ss2 T3
    ss3 := T2(ss2)
    fmt.Println(ss3 == ss1)//true
}
```

如果成员变量中含有不可比较成员变量，即使可以强制转换，也不可以比较

```go
type T2 struct{
    Name string
    Age int
    Arr [2]bool
    ptr *int
    map1 map[string]string
}
type T3 struct{
    Name string
    Age int
    Arr [2]bool
    ptr *int
    map1 map[string]string
}
func main(){
    var ss1 T2
    var ss2 T3
    ss3 := T2(ss2)
    fmt.Println(ss3 == ss1)//报错:invalid operation: ss3 == ss1 (struct containing map[string]string cannot be compared)
}
```

##### struct可以作为map的key吗

```go
type T1 struct{
    Name string
    Age int
    Arr [2]bool
    ptr *int
    slice []int
    map1 map[string]string
}
type T2 struct{
    Name string
    Age int
    Arr [2]bool
    ptr *int
}
func main{
    //m := make(map[T2]string,0)
    //fmt.Print(n) //map[]
    m := make(map[T1]string,0)
    fmt.Println(m)//invalid map key type T1
}
```

struct必须是可比较的，才能作为key，否则编译时报错