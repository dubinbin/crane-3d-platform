import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 清理 dist 目录中的动态资源文件夹
// 这些资源应该从 public 动态加载，不需要打包到 dist
const foldersToRemove = ['json', 'pcd', 'model'];

console.log('\n🧹 清理 dist 目录中的动态资源...\n');

foldersToRemove.forEach(folder => {
  const folderPath = path.join(__dirname, 'dist', folder);
  
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`✅ 已删除 dist/${folder}`);
  } else {
    console.log(`⏭️  dist/${folder} 不存在，跳过`);
  }
});

console.log('\n✨ 清理完成！动态资源将从 public 目录加载\n');

