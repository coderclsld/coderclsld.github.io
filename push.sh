if [ ! $1 ]
then
  echo "####### 请输入提交信息 #######"
  exit;
fi
echo "开始执行命令"
echo "开始构建项目"
npm run build
echo "####### 开始添加文件 #######"
git add .
git reset -- run.js
git status 
sleep 1s
echo "####### 开始提交项目 #######"
git commit -m "$1"
sleep 1s
echo "####### 开始推送项目 #######"
git push
echo "####### 开始更新GiteePage #######"
node ./run.js
echo "脚本执行成功，项目发布完成！！！！"
exit;