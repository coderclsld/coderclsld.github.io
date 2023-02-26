## 生产中git的使用
```git
#开始时先从master拉取最新的代码
git checkout master
#创建自己的开发分支
git checkout -b dev-chenlin
#发布测服
git checkout dev
#合并自己开发的和测服的代码
git pull
git merge dev-chenlin
git push


#发布正服
git checkout master
#更新本地最新的master代码
git pull
git checkout dev-chenlin
#merge master代码解决冲突
git merge master
git checkout master
git merge dev-chenlin
git push
```

## 生产开发中svn的使用

```shell
#取消文件更改
svn resvert [file name]
#取消文件目录
svn resvert --depth=[path name]

svn up
svn log
svn diff -r 10:20 [file name OR path name]
svn diff  -r 10 test.php
#回滚会置顶版本 用svn merge 来进行回滚
svn merge -r 20:10 [file name OR path name]
#更新到某个版本号
svn update -r 版本号


```

