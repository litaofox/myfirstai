# 🐱 我的宠物猫网页

一个介绍我的两只宠物猫（可乐和草草）的网页。

## 功能

- 📷 展示两只猫咪的照片
- 📋 猫咪基本信息（年龄、品种、性别、性格）
- 📖 猫咪故事介绍
- 🎯 猫咪爱好标签

## 技术栈

- HTML5
- CSS3
- JavaScript

## 快速开始

直接在浏览器中打开 `index.html` 文件即可查看效果。

## 推送到 GitHub

### 第一步：安装 Git

下载并安装 Git：https://git-scm.com/download/win

### 第二步：配置 Git

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

### 第三步：初始化仓库

```bash
cd myfistai
git init
git add .
git commit -m "Initial commit"
```

### 第四步：创建 GitHub 仓库

1. 打开 https://github.com
2. 登录你的账号
3. 点击 "New" 创建新仓库
4. 仓库名建议：`myfistai`

### 第五步：推送代码

```bash
git remote add origin https://github.com/你的用户名/myfistai.git
git branch -M main
git push -u origin main
```

## 部署

可以使用 GitHub Pages 部署：

1. 进入仓库 Settings → Pages
2. 选择 main 分支作为 source
3. 保存后等待几分钟
4. 访问：https://你的用户名.github.io/myfistai

## 项目结构

```
myfistai/
├── index.html          # 主页面
├── 可乐.jpg            # 可乐的照片
├── 草草.jpg            # 草草的照片
└── .gitignore          # Git 忽略文件
```

## License

MIT