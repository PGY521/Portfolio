# 🎨 portfolio

在线访问：https://your-portfolio.vercel.app

---

## 📦 部署到 Vercel

### 方法一：手动部署

1. 把整个文件夹上传到 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com)
3. 点击 "New Project" → 导入你的 GitHub 仓库
4. 点击 "Deploy"，完成！

### 方法二：命令行部署

```bash
# 安装 Vercel CLI
npm -g install vercel

# 进入项目目录
cd portfolio

# 登录并部署
vercel

# 正式环境部署
vercel --prod
```

---

## ✏️ 编辑作品

直接在 `app.js` 的 `getSampleWorks()` 函数中添加或修改作品数据即可。

支持格式：CLO 文件（.zprj, .zpac, .zbk 等 11 种格式）
