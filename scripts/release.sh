#!/bin/bash

# 检查是否提供了版本号参数
if [ -z "$1" ]; then
    echo "请提供版本号，例如: ./scripts/release.sh 0.0.4"
    exit 1
fi

NEW_VERSION=$1

# 确保 GH_TOKEN 环境变量存在
if [ -z "$GH_TOKEN" ]; then
    echo "错误: 未设置 GH_TOKEN 环境变量"
    echo "请先运行: export GH_TOKEN=你的GitHub令牌"
    exit 1
fi

# 更新 package.json 中的版本号
npm version $NEW_VERSION --no-git-tag-version

# 提交更改
git add package.json
git commit -m "release: v$NEW_VERSION"

# 创建标签
git tag "v$NEW_VERSION"

# 推送到远程仓库
git push origin main
git push origin "v$NEW_VERSION"

# 清理旧的构建文件
npm run clean

# 构建并发布
npm run release

echo "✨ 发布完成！"
echo "请检查 GitHub Releases 页面确认发布状态"